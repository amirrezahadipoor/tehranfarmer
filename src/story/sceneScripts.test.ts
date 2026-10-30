import { describe, expect, it } from 'vitest';
import { compileSceneScript } from './sceneScripts';
import { NODES, nodeById } from './story';
import { EN_LINES } from '../strings/cinemaLocales';

describe('short prologue regression', () => {
  it('plays six immediate-reading cards and keeps the final choice/effects intact', () => {
    const script = compileSceneScript('p1');
    expect(script).not.toBeNull();
    expect(script!.beats).toHaveLength(6);
    expect(script!.beats.map((beat) => beat.nodeId)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p7']);
    expect(nodeById('p6')).toBeNull();
    expect(script!.flagsSet).toContain('debt.flags.prologue');
    expect(script!.flagsSet).toContain('story.chapter=1');

    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p7']) {
      expect(EN_LINES[id]).toHaveLength(NODES[id].lines.length);
    }
    const text = script!.beats.map((beat) => NODES[beat.nodeId].lines[beat.lineIdx].text).join(' ');
    expect(text).not.toContain('شش میلیون');
  });
});
