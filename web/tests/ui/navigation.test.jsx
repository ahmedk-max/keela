import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { demoRaw } from '../../src/data/demo';
import { Keela } from '../../src/screens/Keela';
import { buildData } from '../../src/data/useKeelaData';

vi.mock('../../src/auth/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'demo' }, loading: false, denied: false, signIn: vi.fn(), signOut: vi.fn() }) }));
vi.mock('../../src/lib/firebase', async () => {
  const { initializeApp, getApps } = await import('firebase/app');
  const { getFirestore } = await import('firebase/firestore');
  return { db: getFirestore(getApps()[0] || initializeApp({ projectId: 'demo-ui-tests', apiKey: 'test-only' })) };
});
const copy = (v) => Array.isArray(v) ? v.map(copy) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k,x]) => [k,copy(x)])) : v;
const baseline = copy(demoRaw);
beforeEach(() => { Object.assign(demoRaw, copy(baseline)); localStorage.clear(); });

describe('application flows with isolated demo data', () => {
  it('creates a bucket, opens it at zero, and makes its first fractional deposit', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole('button', { name: 'Buckets', exact: true }));
    await user.click(screen.getByRole('button', { name: '+ New', exact: true }));
    await user.type(screen.getByRole('textbox', { name: 'Name', exact: true }), 'UI test bucket');
    await user.type(screen.getByRole('textbox', { name: 'Target · SAR', exact: true }), '1000');
    await user.click(screen.getByRole('button', { name: 'Create bucket' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'UI test bucket' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Deposit' }));
    await user.type(screen.getByRole('textbox', { name: 'Amount', exact: true }), '500.25');
    await user.click(screen.getByRole('button', { name: 'Deposit', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const goal = demoRaw.goals.find((g) => g.name === 'UI test bucket');
    expect(goal.allocated).toBe(500.25); expect(goal.targetDate).toBeNull();
    expect(demoRaw.entries.filter((e) => e.path.startsWith(`goals/${goal.id}/entries/`))).toHaveLength(1);
  });
  it('returns from a holding to its portfolio with the parent position and focus restored', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole('button', { name: 'Assets', exact: true }));
    const data = buildData(demoRaw), portfolio = data.portfolios.find((p) => p.holdings.length);
    await user.click(screen.getByRole('button', { name: new RegExp(portfolio.name) }));
    const scroller = document.querySelector('.c-detail-scroll'); scroller.scrollTop = 96;
    const holding = portfolio.holdings[0];
    await user.click(screen.getByRole('button', { name: (name) => name.includes(holding.name) }));
    expect(screen.getByRole('heading', { name: holding.name })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back', exact: true }));
    await waitFor(() => expect(screen.getByRole('heading', { name: portfolio.name })).toBeInTheDocument());
    expect(document.querySelector('.c-detail-scroll').scrollTop).toBe(96);
    expect(screen.getByRole('button', { name: (name) => name.includes(holding.name) })).toHaveFocus();
  });
  it('rapid navigation settles on the chosen destination without a stale detail', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole('button', { name: 'Open Emergency Fund' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true }));
    for (const name of ['Spend', 'Assets', 'Home', 'Buckets', 'Keela']) fireEvent.click(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('button', { name, exact: true }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Your companion' })).toBeInTheDocument());
    await new Promise((done) => setTimeout(done, 300));
    expect(document.querySelector('.k-detail')).toBeNull();
    expect(screen.getByRole('button', { name: 'Keela', exact: true })).toHaveAttribute('aria-current','page');
  });
  it('does not render private or archived memory after the visual migration', () => {
    render(<Keela data={{ memory: [
      { id: 'public', section: 'Public', body: 'Visible public memory' },
      { id: 'private', section: 'Secret section', body: 'Never expose this secret', private: true },
      { id: 'archive', section: 'Old', body: 'Archived hidden text', scope: 'archive' },
    ] }} nav={{}} sub="memory" setSub={() => {}} />);
    expect(screen.getByText('Visible public memory')).toBeInTheDocument();
    expect(screen.queryByText(/Never expose|Secret section|Archived hidden/)).not.toBeInTheDocument();
  });
});
