import { describe, expect, it } from 'vitest';
import { compileSceneScript, objectiveKeyFor } from './sceneScripts';
import { NODES, nodeById } from './story';
import { EN_LINES, OBJECTIVES } from '../strings/cinemaLocales';

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

describe('finale copy and postgame objectives', () => {
  it('does not announce a fixed level in the final quest completion scene', () => {
    const faText = NODES['quest-done-q6'].lines.map((line) => line.text).join(' ');
    const enText = EN_LINES['quest-done-q6'].join(' ');
    expect(faText).toContain('هر سه مزرعه');
    expect(faText).not.toContain('بیست‌ودو');
    expect(enText).toContain('All three estate charters');
    expect(enText).not.toContain('Twenty-Two');
  });

  it('never sends a postgame scene back to installment objectives', () => {
    for (const id of ['quest-done-q6', 'ch6-outro', 'finale', 'area-intro-cave']) {
      const key = objectiveKeyFor(id, true);
      expect(key).toBe('postgame');
      expect(OBJECTIVES.fa[key]).not.toContain('قسط');
      expect(OBJECTIVES.en[key]).not.toContain('installment');
    }
    expect(objectiveKeyFor('quest-done-q6')).toBe('q6done');
  });

  it('gives the true epilogue a complete eight-secret objective in both locales', () => {
    const key = objectiveKeyFor('secret-true-epilogue', true);
    expect(key).toBe('epilogue');
    expect(OBJECTIVES.fa[key]).toContain('هر هشت راز');
    expect(OBJECTIVES.fa[key]).not.toContain('قسط');
    expect(OBJECTIVES.en[key]).toContain('all eight secrets');
    expect(OBJECTIVES.en[key]).not.toContain('installment');
  });
});
