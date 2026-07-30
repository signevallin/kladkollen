import Svg, { Circle, Path } from 'react-native-svg'

// Spotifys ikon-logga: grön cirkel (#1ED760, den officiella brand-gröna) med tre
// vita ljudvågor. Färgas inte om och förvrängs inte, enligt Spotifys brand
// guidelines. OBS: för det fullständiga ordmärket (ikon + "Spotify"-text) krävs
// Spotifys officiella SVG-asset – den kan inte återges troget från en rasterbild.
export default function SpotifyLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={12} fill="#1ED760" />
      <Path d="M5 9.3 Q12 6.9 19 9.3" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Path d="M6 12.4 Q12 10.2 18 12.4" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M7 15.2 Q12 13.4 17 15.2" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </Svg>
  )
}
