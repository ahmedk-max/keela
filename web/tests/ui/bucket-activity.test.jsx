import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { demoRaw } from '../../src/data/demo';
import { SwipeRow } from '../../src/ui/SwipeRow';

vi.mock('../../src/auth/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'demo' }, loading: false, denied: false, signIn: vi.fn(), signOut: vi.fn() }) }));
vi.mock('../../src/lib/firebase', async () => {
  const { initializeApp, getApps } = await import('firebase/app');
  const { getFirestore } = await import('firebase/firestore');
  return { db: getFirestore(getApps()[0] || initializeApp({ projectId: 'demo-bucket-tests', apiKey: 'test-only' })) };
});

const purchase = { path: 'goals/marriage/entries/appliances', type: 'spend', amount: 1250, date: '2026-10-03', note: 'Appliances' };
beforeEach(() => {
  localStorage.clear();
  demoRaw.goals = [
    { id: 'marriage', name: 'Marriage', allocated: 12000, spent: 4300, target: 130000, status: 'completed' },
    { id: 'kitchen', name: 'Kitchen Part 1', allocated: 8000, spent: 2300, target: 8000, status: 'completed' },
  ];
  demoRaw.entries = [{ ...purchase }, { path: 'goals/kitchen/entries/original', type: 'spend', amount: 2000, date: '2026-09-19', note: 'Original purchase' }];
});
async function openBucket(user) {
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Buckets', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Open Marriage' }));
  await screen.findByRole('heading', { name: 'Marriage' });
}
const activity = () => screen.getByRole('button', { name: /^Edit Appliances/ });
const source = () => demoRaw.goals.find((g) => g.id === 'marriage');

describe('bucket activity corrections', () => {
  it('edits amount, date and note while preserving the bucket opening balance', async () => {
    const user = userEvent.setup(); await openBucket(user);
    await user.click(activity());
    const amount = screen.getByRole('textbox', { name: 'Amount', exact: true });
    await user.clear(amount); await user.type(amount, '1100.25');
    fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: '2026-10-04' } });
    const note = screen.getByRole('textbox', { name: 'Note · optional' });
    await user.clear(note); await user.type(note, 'Corrected appliances');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(source().allocated).toBe(12000);
    expect(source().spent).toBe(4150.25);
    expect(demoRaw.entries.find((e) => e.path === purchase.path)).toMatchObject({ amount: 1100.25, date: '2026-10-04', note: 'Corrected appliances', revision: 1 });
    expect(screen.getByRole('button', { name: /^Edit Corrected appliances/ })).toBeInTheDocument();
  });
  it('moves the mistaken purchase and preserves the original purchase awaiting refund', async () => {
    const user = userEvent.setup(); await openBucket(user);
    await user.click(activity());
    await user.selectOptions(screen.getByRole('combobox', { name: 'Bucket' }), 'kitchen');
    expect(screen.getByText('Kitchen Part 1 after correction')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(source().spent).toBe(3050);
    expect(demoRaw.goals.find((g) => g.id === 'kitchen').spent).toBe(3550);
    expect(demoRaw.entries.find((e) => e.path === purchase.path)).toBeUndefined();
    expect(demoRaw.entries.find((e) => e.path === 'goals/kitchen/entries/appliances')).toMatchObject({ amount: 1250, note: 'Appliances' });
    expect(demoRaw.entries.find((e) => e.path === 'goals/kitchen/entries/original').amount).toBe(2000);
    expect(screen.queryByRole('button', { name: /^Edit Appliances/ })).not.toBeInTheDocument();
  });
  it('reveals row actions, cancels a deletion, then confirms it and restores the funds once', async () => {
    const user = userEvent.setup(); await openBucket(user);
    await user.click(screen.getByRole('button', { name: /^Actions for Appliances/ }));
    await user.click(screen.getByRole('button', { name: /^Delete Appliances/ }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(source().spent).toBe(4300);
    await user.click(screen.getByRole('button', { name: /^Delete Appliances/ }));
    await user.dblClick(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete entry' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(source().spent).toBe(3050);
    expect(demoRaw.entries.find((e) => e.path === purchase.path)).toBeUndefined();
  });
  it('keeps the draft offline and rejects a concurrent correction without overwriting it', async () => {
    const user = userEvent.setup(); await openBucket(user); await user.click(activity());
    const amount = screen.getByRole('textbox', { name: 'Amount', exact: true });
    await user.clear(amount); await user.type(amount, '5000');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    fireEvent(window, new Event('offline'));
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(amount).toHaveValue('5000');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    fireEvent(window, new Event('online'));
    demoRaw.entries[0].revision = 1; demoRaw.entries[0].note = 'Edited elsewhere';
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('changed or was removed');
    expect(amount).toHaveValue('5000');
    expect(source().spent).toBe(4300);
    expect(demoRaw.entries[0].note).toBe('Edited elsewhere');
  });
  it('asks how an old withdrawal was recorded before reversing a legacy purchase', async () => {
    demoRaw.entries[0].type = 'withdrawal';
    const user = userEvent.setup(); await openBucket(user);
    await user.click(screen.getByRole('button', { name: /^Actions for Appliances/ }));
    await user.click(screen.getByRole('button', { name: /^Delete Appliances/ }));
    expect(screen.getByRole('button', { name: 'Delete entry' })).toBeDisabled();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Original action' }), 'spend');
    await user.click(screen.getByRole('button', { name: 'Delete entry' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(source().spent).toBe(3050); expect(source().allocated).toBe(12000);
  });
});

it('swipes horizontally to reveal actions without triggering edit or claiming a vertical scroll', () => {
  const edit = vi.fn(), change = vi.fn();
  const { container, rerender } = render(<SwipeRow label="purchase" open={false} onOpenChange={change} onEdit={edit} onDelete={() => {}}>Purchase</SwipeRow>);
  const front = container.querySelector('.c-swipe-front');
  front.setPointerCapture = vi.fn();
  const pointer = (event, x, y) => {
    const e = new Event(event, { bubbles: true });
    Object.assign(e, { pointerId: 1, clientX: x, clientY: y, button: 0, isPrimary: true });
    fireEvent(front, e);
  };
  pointer('pointerdown', 200, 100); pointer('pointermove', 190, 170); pointer('pointerup', 190, 170);
  expect(front.setPointerCapture).not.toHaveBeenCalled(); expect(change).not.toHaveBeenCalled();
  pointer('pointerdown', 220, 100); pointer('pointermove', 100, 105); pointer('pointerup', 100, 105);
  expect(change).toHaveBeenCalledWith(true);
  fireEvent.click(screen.getByRole('button', { name: 'Edit purchase' }));
  expect(edit).not.toHaveBeenCalled();
  rerender(<SwipeRow label="purchase" open onOpenChange={change} onEdit={edit} onDelete={() => {}}>Purchase</SwipeRow>);
  expect(screen.getByRole('button', { name: 'Delete purchase' })).toHaveAttribute('tabindex', '0');
  fireEvent.keyDown(front, { key: 'Escape' }); expect(change).toHaveBeenLastCalledWith(false);
});
