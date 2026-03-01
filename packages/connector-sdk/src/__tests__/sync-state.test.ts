import { describe, it, expect } from 'vitest';
import { SyncState, SyncStateMachine } from '../sync-state.js';

describe('SyncStateMachine', () => {
  it('starts in IDLE state', () => {
    const sm = new SyncStateMachine();
    expect(sm.state).toBe(SyncState.IDLE);
  });

  it('transitions IDLE -> SYNCING', () => {
    const sm = new SyncStateMachine();
    sm.transition(SyncState.SYNCING);
    expect(sm.state).toBe(SyncState.SYNCING);
  });

  it('transitions SYNCING -> COMPLETING -> IDLE (success path)', () => {
    const sm = new SyncStateMachine();
    sm.transition(SyncState.SYNCING);
    sm.transition(SyncState.COMPLETING);
    sm.transition(SyncState.IDLE);
    expect(sm.state).toBe(SyncState.IDLE);
  });

  it('transitions SYNCING -> FAILED', () => {
    const sm = new SyncStateMachine();
    sm.transition(SyncState.SYNCING);
    sm.transition(SyncState.FAILED);
    expect(sm.state).toBe(SyncState.FAILED);
  });

  it('transitions SYNCING -> DEGRADED', () => {
    const sm = new SyncStateMachine();
    sm.transition(SyncState.SYNCING);
    sm.transition(SyncState.DEGRADED);
    expect(sm.state).toBe(SyncState.DEGRADED);
  });

  it('transitions COMPLETING -> DEGRADED', () => {
    const sm = new SyncStateMachine();
    sm.transition(SyncState.SYNCING);
    sm.transition(SyncState.COMPLETING);
    sm.transition(SyncState.DEGRADED);
    expect(sm.state).toBe(SyncState.DEGRADED);
  });

  it('transitions COMPLETING -> FAILED', () => {
    const sm = new SyncStateMachine();
    sm.transition(SyncState.SYNCING);
    sm.transition(SyncState.COMPLETING);
    sm.transition(SyncState.FAILED);
    expect(sm.state).toBe(SyncState.FAILED);
  });

  it('transitions FAILED -> IDLE (recovery)', () => {
    const sm = new SyncStateMachine();
    sm.transition(SyncState.SYNCING);
    sm.transition(SyncState.FAILED);
    sm.transition(SyncState.IDLE);
    expect(sm.state).toBe(SyncState.IDLE);
  });

  it('transitions DEGRADED -> IDLE', () => {
    const sm = new SyncStateMachine();
    sm.transition(SyncState.SYNCING);
    sm.transition(SyncState.DEGRADED);
    sm.transition(SyncState.IDLE);
    expect(sm.state).toBe(SyncState.IDLE);
  });

  it('transitions DEGRADED -> SYNCING (retry)', () => {
    const sm = new SyncStateMachine();
    sm.transition(SyncState.SYNCING);
    sm.transition(SyncState.DEGRADED);
    sm.transition(SyncState.SYNCING);
    expect(sm.state).toBe(SyncState.SYNCING);
  });

  it('throws on invalid transitions', () => {
    const sm = new SyncStateMachine();
    expect(() => sm.transition(SyncState.COMPLETING)).toThrow(
      'Invalid sync state transition: IDLE -> COMPLETING',
    );
  });

  it('throws on IDLE -> FAILED', () => {
    const sm = new SyncStateMachine();
    expect(() => sm.transition(SyncState.FAILED)).toThrow(
      'Invalid sync state transition: IDLE -> FAILED',
    );
  });

  it('canTransitionTo returns correct results', () => {
    const sm = new SyncStateMachine();
    expect(sm.canTransitionTo(SyncState.SYNCING)).toBe(true);
    expect(sm.canTransitionTo(SyncState.COMPLETING)).toBe(false);
    expect(sm.canTransitionTo(SyncState.FAILED)).toBe(false);
  });

  it('reset returns to IDLE', () => {
    const sm = new SyncStateMachine();
    sm.transition(SyncState.SYNCING);
    sm.transition(SyncState.FAILED);
    sm.reset();
    expect(sm.state).toBe(SyncState.IDLE);
    expect(sm.lastTransition).toBeNull();
  });

  it('records lastTransition timestamp', () => {
    const sm = new SyncStateMachine();
    expect(sm.lastTransition).toBeNull();
    sm.transition(SyncState.SYNCING);
    expect(sm.lastTransition).not.toBeNull();
  });
});
