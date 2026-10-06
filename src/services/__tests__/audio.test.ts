import { describe, expect, it } from 'vitest'
import { compareVoices, voiceQuality } from '../audio/AudioService'

const v = (name: string, localService = true, voiceURI = name) => ({ name, voiceURI, lang: 'fi-FI', localService })

describe('Finnish voice ranking', () => {
  it('classifies voices by quality', () => {
    expect(voiceQuality(v('Eddy (Finnish (Finland))'))).toBe('robotic')
    expect(voiceQuality(v('Grandma', true, 'com.apple.eloquence.fi-FI.Grandma'))).toBe('robotic')
    expect(voiceQuality(v('Satu'))).toBe('standard')
    expect(voiceQuality(v('Satu', true, 'com.apple.voice.enhanced.fi-FI.Satu'))).toBe('natural')
    expect(voiceQuality(v('Microsoft Noora Online (Natural) - Finnish (Finland)', false))).toBe('natural')
  })

  it('puts natural voices first and robotic voices last', () => {
    // The voices Chrome lists on macOS, plus an Edge natural voice.
    const voices = [
      v('Eddy (Finnish (Finland))'),
      v('Flo (Finnish (Finland))'),
      v('Grandpa (Finnish (Finland))'),
      v('Satu'),
      v('Shelley (Finnish (Finland))'),
      v('Microsoft Harri Online (Natural) - Finnish (Finland)', false),
    ]
    expect(voices.sort(compareVoices).map((x) => x.name)).toEqual([
      'Microsoft Harri Online (Natural) - Finnish (Finland)',
      'Satu',
      'Eddy (Finnish (Finland))',
      'Flo (Finnish (Finland))',
      'Grandpa (Finnish (Finland))',
      'Shelley (Finnish (Finland))',
    ])
  })

  it('prefers on-device voices of equal quality', () => {
    const voices = [v('Heidi online', false), v('Satu')]
    expect(voices.sort(compareVoices)[0]?.name).toBe('Satu')
  })
})
