import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App, { VitalsPage } from './App';

describe('staff sign-in', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => cleanup());

  it('shows accessible email and password fields when signed out', async () => {
    render(<App />);
    expect((await screen.findByRole('heading', { name: 'Welcome back' })).textContent).toBe('Welcome back');
    expect((screen.getByLabelText('Work email') as HTMLInputElement).type).toBe('email');
    expect((screen.getByLabelText('Password') as HTMLInputElement).type).toBe('password');
    expect((screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('vital-sign entry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => ({ ok: true, json: async () => ({ items: String(input).includes('/vitals') ? [] : [{ _id: 'patient-1', firstName: 'Alex', lastName: 'Patient', patientNumber: 'CF-001' }] }) })));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('opens a validated vital form after selecting a patient', async () => {
    render(<VitalsPage />);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Patient' }), { target: { value: 'patient-1' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Record first vitals' }));
    expect((await screen.findByRole('heading', { name: 'Record vital signs' })).textContent).toBe('Record vital signs');
    expect((screen.getByLabelText('Systolic BP · mmHg') as HTMLInputElement).required).toBe(true);
    expect((screen.getByLabelText('Oxygen saturation · %') as HTMLInputElement).max).toBe('100');
    expect((screen.getByLabelText('Weight · kg') as HTMLInputElement).required).toBe(false);
  });
});
