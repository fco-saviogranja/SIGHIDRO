import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, beforeEach, expect } from 'vitest';
import { HydroRegistryProvider, useHydroRegistry } from '../HydroRegistryContext';

function TestConsumer() {
  const { createRecord } = useHydroRegistry();

  React.useEffect(() => {
    createRecord('poço', {
      name: 'T',
      location: 'L',
      status: 'operando',
      responsible: 'Operador Hidráulico',
      flowRate: 1,
      lastReading: 'now',
    });
  }, [createRecord]);

  return <div>consumer</div>;
}

describe('HydroRegistryProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists registry after creating a record', async () => {
    render(
      <HydroRegistryProvider>
        <TestConsumer />
      </HydroRegistryProvider>,
    );

    await waitFor(() => {
      const stored = window.localStorage.getItem('sighidro:hydro-registry:v1');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.poço.length).toBeGreaterThan(0);
    });
  });
});
