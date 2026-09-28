import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useVisibleViewport } from '../../src/ui/viewport';

it('follows the visible keyboard area, ignores pinch zoom, and removes its listeners', () => {
  const original = window.visualViewport;
  const viewport = Object.assign(new EventTarget(), {height:844,offsetTop:0,scale:1});
  const remove = vi.spyOn(viewport, 'removeEventListener');
  Object.defineProperty(window, 'visualViewport', {configurable:true,value:viewport});
  const {result,unmount} = renderHook(() => useVisibleViewport());
  expect(result.current['--vv-height']).toBe('844px');
  act(() => { viewport.height=390; viewport.offsetTop=42; viewport.dispatchEvent(new Event('resize')); });
  expect(result.current).toEqual({'--vv-height':'390px','--vv-top':'42px','--sheet-bottom-pad':'16px'});
  act(() => { viewport.scale=2; viewport.height=195; viewport.dispatchEvent(new Event('resize')); });
  expect(result.current['--vv-height']).toBe('390px');
  act(() => { viewport.scale=1; viewport.height=844; viewport.offsetTop=0; viewport.dispatchEvent(new Event('scroll')); });
  expect(result.current['--sheet-bottom-pad']).toBe('calc(16px + env(safe-area-inset-bottom))');
  unmount();
  expect(remove).toHaveBeenCalledWith('resize',expect.any(Function));
  expect(remove).toHaveBeenCalledWith('scroll',expect.any(Function));
  Object.defineProperty(window, 'visualViewport', {configurable:true,value:original});
});
