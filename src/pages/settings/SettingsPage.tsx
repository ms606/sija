import { Play, Snail } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Card, CardTitle } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { Segmented } from '../../components/ui/Segmented'
import { useAudio } from '../../hooks/useAudio'
import { DEFAULT_SETTINGS, useSettings, type LearnerMode, type MotionPref, type PictureStyle, type ThemePref } from '../../stores/settings'

const SAMPLE = 'Hyvää päivää! Talossa, talosta, taloon.'

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 shrink-0 accent-[var(--primary)]" />
    </label>
  )
}

function VoiceSettings() {
  const { voices, supported, ready, speak } = useAudio()
  const voiceURI = useSettings((s) => s.voiceURI)
  const set = useSettings((s) => s.set)
  if (!supported) return <p className="text-muted">This browser cannot speak text aloud. Every exercise works without audio.</p>
  return (
    <div className="space-y-3">
      {ready && voices.length === 0 ? (
        <div className="rounded-xl bg-warning-soft p-3 text-sm">
          <p className="font-semibold text-warning">No Finnish voice found on this device.</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>macOS: System Settings → Accessibility → Spoken Content → System voice → Manage Voices → Finnish (Satu).</li>
            <li>Windows: Settings → Time &amp; language → Speech → Add voices → Finnish.</li>
            <li>iPhone/iPad: Settings → Accessibility → Spoken Content → Voices → Finnish.</li>
            <li>Android: Settings → Text-to-speech → Speech services by Google → Install voice data → Finnish.</li>
          </ul>
          <p className="mt-1">Then reload this page.</p>
        </div>
      ) : (
        <label className="block">
          <span className="mb-1 block font-semibold">Finnish voice</span>
          <select
            value={voiceURI ?? ''}
            onChange={(e) => set({ voiceURI: e.target.value || null })}
            className="min-h-11 w-full max-w-md rounded-lg border border-border-strong bg-surface px-2"
          >
            <option value="">Automatic (best voice available)</option>
            {voices.map((v) => (
              <option key={v.uri} value={v.uri}>
                {v.name} ({v.lang}){v.quality === 'natural' ? ' — natural' : v.quality === 'robotic' ? ' — robotic, not recommended' : ''}
                {v.local ? '' : ' — online'}
              </option>
            ))}
          </select>
        </label>
      )}
      {ready && voices[0] && voices[0].quality !== 'natural' && (
        <div className="rounded-xl bg-surface-2 p-3 text-sm">
          <p className="font-semibold">For a more natural Finnish voice</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>macOS / iPhone / iPad: in Spoken Content → Manage Voices → Finnish, download the higher-quality Satu voice (Enhanced or Premium), then reload this page.</li>
            <li>Or open Sija in Microsoft Edge, which has free natural Finnish voices (Noora, Harri, Selma). They need an internet connection.</li>
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void speak(SAMPLE, 'normal')} icon={<Play aria-hidden className="size-4" />}>
          Test: normal speed
        </Button>
        <Button onClick={() => void speak(SAMPLE, 'slow')} icon={<Snail aria-hidden className="size-4" />}>
          Test: slow
        </Button>
      </div>
      <p className="text-sm text-muted">Audio is synthesised on your device and never stored. Recorded audio, when available for a word, is played instead.</p>
    </div>
  )
}

export default function SettingsPage() {
  const s = useSettings()
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Settings" fi="Asetukset" />

      <Card className="space-y-4">
        <CardTitle sub="Changes the language of explanations and how much detail is shown.">Learner mode</CardTitle>
        <Segmented<LearnerMode>
          label="Learner mode"
          value={s.mode}
          options={[
            { value: 'beginner', label: 'Beginner', hint: 'English explanations, lots of visual support' },
            { value: 'intermediate', label: 'Intermediate', hint: 'Finnish explanations with English glosses' },
            { value: 'advanced', label: 'Advanced', hint: 'Finnish explanations, Kotus types and technical detail' },
          ]}
          onChange={(mode) => s.set({ mode })}
        />
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">
          <li>Beginner: English explanations with Finnish terms, case names in English.</li>
          <li>Intermediate: Finnish explanations where available, with short English glosses.</li>
          <li>Advanced: Finnish explanations and terminology, Kotus type numbers.</li>
        </ul>
      </Card>

      <Card className="space-y-4">
        <CardTitle>Display</CardTitle>
        <div>
          <p className="mb-2 font-semibold">Theme</p>
          <Segmented<ThemePref>
            label="Theme"
            value={s.theme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(theme) => s.set({ theme })}
          />
        </div>
        <div>
          <p className="mb-2 font-semibold">Animations</p>
          <Segmented<MotionPref>
            label="Animations"
            value={s.motion}
            options={[
              { value: 'system', label: 'System' },
              { value: 'reduce', label: 'Reduced' },
              { value: 'full', label: 'Full' },
            ]}
            onChange={(motion) => s.set({ motion })}
          />
        </div>
        <div>
          <p className="mb-2 font-semibold">Pictures</p>
          <Segmented<PictureStyle>
            label="Pictures"
            value={s.pictureStyle}
            options={[
              { value: 'auto', label: 'Automatic' },
              { value: 'photo', label: 'Photos' },
              { value: 'illustration', label: 'Drawings' },
              { value: 'emoji', label: 'Emoji' },
            ]}
            onChange={(pictureStyle) => s.set({ pictureStyle })}
          />
        </div>
        <Toggle label="Label word parts" hint="Show ROOT, STEM, CASE… under coloured word parts." checked={s.showRoleLabels} onChange={(v) => s.set({ showRoleLabels: v })} />
        <Toggle label="Show translations" hint="English translations under example sentences." checked={s.showTranslations} onChange={(v) => s.set({ showTranslations: v })} />
      </Card>

      <Card className="space-y-3">
        <CardTitle>Daily goal</CardTitle>
        <Segmented
          label="Exercises per day"
          value={String(s.dailyGoal)}
          options={['10', '20', '30', '50'].map((v) => ({ value: v, label: `${v} exercises` }))}
          onChange={(v) => s.set({ dailyGoal: Number(v) })}
        />
      </Card>

      <Card>
        <CardTitle>Audio</CardTitle>
        <VoiceSettings />
      </Card>

      <Card className="space-y-2">
        <CardTitle>Data and credits</CardTitle>
        <p className="text-sm text-muted">
          Everything you do is stored on this device only. Export, import or reset your progress on the{' '}
          <Link to="/progress" className="font-semibold text-primary hover:underline">
            Progress page
          </Link>
          . See{' '}
          <Link to="/credits" className="font-semibold text-primary hover:underline">
            credits and licences
          </Link>{' '}
          for data sources.
        </p>
        <Button variant="ghost" onClick={() => s.set({ ...DEFAULT_SETTINGS })}>
          Restore default settings
        </Button>
      </Card>
    </div>
  )
}
