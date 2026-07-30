import Svg, { Circle, Path } from 'react-native-svg'

// Spotifys ikon-logga (grön cirkel + tre ljudvågor). Ritas i den officiella
// gröna (#1DB954) och färgas inte om, enligt Spotifys brand guidelines.
// OBS: för pixel-perfekt efterlevnad kan detta bytas mot Spotifys officiella
// asset från deras varumärkessida – strukturen (rätt färg, oförändrad) är redan
// enligt riktlinjerna.
export default function SpotifyLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={12} fill="#1DB954" />
      <Path d="M5.5 9.2 Q12 6.6 18.6 9.4" stroke="#000" strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M6.4 12.4 Q12 10.2 17.7 12.6" stroke="#000" strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Path d="M7.2 15.3 Q12 13.6 16.8 15.5" stroke="#000" strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </Svg>
  )
}
