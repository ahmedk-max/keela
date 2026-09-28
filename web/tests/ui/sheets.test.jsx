import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet, Field, SheetSave, SheetDelete, AmountField } from '../../src/ui/sheets';
import { TxSheet, BillSheet, CategoryBudgetSheet } from '../../src/screens/spending-extras';
import { EditBucketSheet } from '../../src/screens/Buckets';
import { IncomeSettingsSheet } from '../../src/screens/home-extras';

vi.mock('../../src/data/writes', () => ({ operationId: () => 'stable-operation' }));

function Fixture({ save = async () => {}, onClosed = () => {}, failDelete }) {
  const [open, setOpen] = React.useState(false), [name, setName] = React.useState('Original');
  const [color, setColor] = React.useState('Warm');
  return <div className="k-root"><button onClick={() => setOpen(true)}>Open entry</button>
    {open && <Sheet title="Entry" draft={{ name, color }} onClose={() => { setOpen(false); onClosed(); }}>
      {(close) => <><Field label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
        <button type="button" data-draft aria-pressed={color === 'Cool'} onClick={() => setColor((v) => v === 'Warm' ? 'Cool' : 'Warm')}>Cool colour</button>
        <SheetSave disabled={!name.trim()} onClick={async () => { await save(name); close(); }}>Save entry</SheetSave>
        <SheetDelete onClick={async () => { await failDelete?.(); close(); }} />
      </>}
    </Sheet>}
  </div>;
}
async function start(props) {
  const user = userEvent.setup(); render(<Fixture {...props} />);
  await user.click(screen.getByRole('button', { name: 'Open entry' }));
  return user;
}
async function closed() { await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); }

describe('shared sheet behavior', () => {
  it('labels the dialog, traps focus, and restores its opener after Escape', async () => {
    const user = await start();
    expect(screen.getByRole('dialog', { name: 'Entry' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entry' })).toHaveFocus();
    for (let i = 0; i < 10; i++) { await user.tab(); expect(screen.getByRole('dialog')).toContainElement(document.activeElement); }
    await user.keyboard('{Escape}'); await closed();
    expect(screen.getByRole('button', { name: 'Open entry' })).toHaveFocus();
  });
  it('preserves a draft and returns focus to the edited field after Keep editing', async () => {
    const user = await start();
    await user.clear(screen.getByRole('textbox', { name: 'Name', exact: true })); await user.type(screen.getByRole('textbox', { name: 'Name', exact: true }), 'Changed');
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(screen.getByRole('alertdialog', { name: 'Discard changes?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep editing' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Changed');
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Name', exact: true })).toHaveFocus());
  });
  it('treats reverted field and custom control values as clean', async () => {
    const user = await start();
    await user.clear(screen.getByRole('textbox', { name: 'Name', exact: true })); await user.type(screen.getByRole('textbox', { name: 'Name', exact: true }), 'Original');
    await user.click(screen.getByRole('button', { name: 'Cool colour' }));
    await user.click(screen.getByRole('button', { name: 'Cool colour' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' })); await closed();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
  it('protects custom controls and discards only after explicit confirmation', async () => {
    const onClosed = vi.fn(); const user = await start({ onClosed });
    await user.click(screen.getByRole('button', { name: 'Cool colour' })); await user.keyboard('{Escape}');
    expect(onClosed).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Discard changes', exact: true })); await closed();
    expect(onClosed).toHaveBeenCalledTimes(1);
  });
  it('keeps errors and values after a rejected write, then retries once', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(undefined);
    const user = await start({ save });
    await user.type(screen.getByRole('textbox', { name: 'Name', exact: true }), ' draft');
    await user.click(screen.getByRole('button', { name: 'Save entry' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost');
    expect(screen.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Original draft');
    await user.click(screen.getByRole('button', { name: 'Try again' })); await closed();
    expect(save).toHaveBeenCalledTimes(2);
  });
  it('prevents repeated writes and dismissal while a write is pending', async () => {
    let resolve; const save = vi.fn(() => new Promise((done) => { resolve = done; }));
    const user = await start({ save });
    await user.dblClick(screen.getByRole('button', { name: 'Save entry' }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument(); expect(save).toHaveBeenCalledTimes(1);
    resolve(); await closed();
  });
  it('does not announce success until the write resolves', async () => {
    let resolve; const saved = vi.fn(); window.addEventListener('keela:saved', saved);
    const user = await start({ save: () => new Promise((done) => { resolve = done; }) });
    await user.click(screen.getByRole('button', { name: 'Save entry' })); expect(saved).not.toHaveBeenCalled();
    resolve(); await closed(); expect(saved).toHaveBeenCalledTimes(1);
    window.removeEventListener('keela:saved', saved);
  });
  it('keeps a destructive confirmation open on failure without losing the form', async () => {
    const user = await start({ failDelete: async () => { throw new Error('Delete failed'); } });
    await user.click(screen.getByRole('button', { name: 'Delete', exact: true }));
    const confirm = screen.getByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Delete record', exact: true }));
    expect(await within(confirm).findByRole('alert')).toHaveTextContent('Delete failed');
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Original');
  });
  it('disables saving while offline and resumes the same draft after reconnect', async () => {
    const user = await start();
    fireEvent(window, new Event('offline')); // pair browser connectivity state with its event
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false }); fireEvent(window, new Event('offline'));
    expect(screen.getByRole('button', { name: 'Save entry' })).toBeDisabled();
    expect(screen.getByText(/Reconnect to save/)).toBeInTheDocument();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); fireEvent(window, new Event('online'));
    expect(screen.getByRole('button', { name: 'Save entry' })).toBeEnabled();
  });
  it('finishes a rapid double-close once and safely unmounts during transition', async () => {
    const onClosed = vi.fn(); const user = await start({ onClosed });
    await user.dblClick(screen.getByRole('button', { name: 'Close dialog' })); await closed();
    expect(onClosed).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Open entry' }));
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    // No delayed close callback may survive an interrupted host unmount.
    const before = onClosed.mock.calls.length;
    (await import('@testing-library/react')).cleanup();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(onClosed).toHaveBeenCalledTimes(before);
  });
});

describe('real forms', () => {
  it('renders an existing bill and validates whole-number due days without crashing', async () => {
    const user = userEvent.setup();
    render(<BillSheet bill={{id:'bill',name:'Internet',amount:200,type:'monthly',day:15}} onClose={() => {}} onSave={() => {}} onDelete={() => {}} />);
    const day = screen.getByLabelText('Billing day · optional');
    expect(day).toHaveValue('15');
    await user.clear(day); await user.type(day, '1.5');
    expect(day).toHaveAccessibleDescription('Enter a whole number.');
  });
  it('keeps settings edits and the slider draft when sign-out confirmation is cancelled', async () => {
    const user = userEvent.setup();
    render(<IncomeSettingsSheet profile={{name:'Demo',payday:27,split:{save:70,live:30}}} income={[{id:'salary',name:'Salary',amount:1000,recurring:true}]} nav={{theme:'light',toggleTheme:()=>{},signOut:vi.fn()}} onClose={() => {}} onSave={() => {}} />);
    const payday = screen.getByRole('textbox',{name:'Payday',exact:true});
    expect(payday).toHaveValue('27');
    fireEvent.change(screen.getByRole('slider'),{target:{value:'75'}});
    await user.clear(payday); await user.type(payday, '29');
    expect(payday).toHaveAccessibleDescription('Enter 28 or less.');
    expect(screen.getByRole('button',{name:'Save settings'})).toBeDisabled();
    await user.click(screen.getByRole('button',{name:'Sign out',exact:true}));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'Cancel'}));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('slider')).toHaveValue('75');
    await user.click(screen.getByRole('button',{name:'Close settings'}));
    expect(screen.getByRole('alertdialog',{name:'Discard changes?'})).toBeInTheDocument();
  });
  it('associates amount validation with the input and preserves fractional money on save', async () => {
    const user = userEvent.setup(), onSave = vi.fn();
    render(<TxSheet tx={null} txns={[]} onClose={() => {}} onSave={onSave} onDelete={() => {}} />);
    await user.type(screen.getByRole('textbox', { name: 'Amount', exact: true }), '12.345');
    expect(screen.getByRole('textbox', { name: 'Amount', exact: true })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox', { name: 'Amount', exact: true })).toHaveAccessibleDescription(/two|2 decimal/);
    await user.clear(screen.getByRole('textbox', { name: 'Amount', exact: true })); await user.type(screen.getByRole('textbox', { name: 'Amount', exact: true }), '12.35');
    await user.type(screen.getByRole('textbox', { name: 'Paid to / what for', exact: true }), 'Coffee');
    await user.click(screen.getByRole('button', { name: 'Add expense', exact: true }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ amount: 12.35, name: 'Coffee', operationId: 'stable-operation' }));
  });
  it('keeps removing a category limit valid with an empty amount', async () => {
    const user = userEvent.setup(), onSave = vi.fn();
    render(<CategoryBudgetSheet cat="Food" cap={0} onClose={() => {}} onSave={onSave} />);
    expect(screen.getByLabelText('Per payday cycle')).toHaveAttribute('aria-invalid', 'false');
    await user.click(screen.getByRole('button', { name: 'Save budget' })); expect(onSave).toHaveBeenCalledWith('Food', 0);
  });
  it('tracks bucket colour changes without inventing a deadline', async () => {
    const user = userEvent.setup();
    render(<EditBucketSheet goal={{ id: null, name: '', target: 0 }} onClose={() => {}} onSave={() => {}} onArchive={() => {}} />);
    await user.click(screen.getByText('Monthly plan, colour & other options'));
    await user.click(screen.getByRole('button', { name: 'Colour #E0913A' }));
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Target month · optional')).toHaveValue('');
  });
});
