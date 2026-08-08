# Three clips of identical synthetic US English, differing only in one sentence.
# The point is a controlled A/B: if the answer moves, only the name can have moved it.
# Jake is the control — if a neutral name also shifts the verdict, the problem is names in
# general rather than foreign ones.
Add-Type -AssemblyName System.Speech
$out = Join-Path $PSScriptRoot '..\data\name-probe-audio'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$base = 'Yo, what is up. I am chilling right now. NAMESLOT I am really tired, I am not gonna lie. Just came back from the supermarket and it was really crowded. So after I got back I immediately just jumped on my bed. I am just scrolling through my phone right now, just chilling. You feel me. Anyway, nothing much going on today, just taking it easy and probably gonna order some food later.'
$variants = @{
  'none'      = $base.Replace('NAMESLOT ','')
  'vladislav' = $base.Replace('NAMESLOT','My name is Vladislav.')
  'jake'      = $base.Replace('NAMESLOT','My name is Jake.')
}
foreach ($k in $variants.Keys) {
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $s.SelectVoice('Microsoft David Desktop')
  $s.SetOutputToWaveFile((Join-Path $out ($k + '.wav')))
  $s.Speak($variants[$k])
  $s.Dispose()
  Write-Output ("wrote " + $k + ".wav")
}
