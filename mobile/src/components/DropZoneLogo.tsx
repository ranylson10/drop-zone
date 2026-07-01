import { useEffect, useRef } from 'react'
import { Animated, Easing, ViewStyle } from 'react-native'
import Svg, { Defs, G, LinearGradient, Polygon, Stop } from 'react-native-svg'

const AnimatedSvg = Animated.createAnimatedComponent(Svg)

type DropZoneLogoProps = {
  size?: number
  color?: string
  secondaryColor?: string
  backgroundColor?: string
  animated?: boolean
  showContainer?: boolean
  style?: ViewStyle
}

const VIEWBOX = '0 0 3024.12 2385.97'
const LEFT = '1357.9,2.21 1.48,562.06 1.48,1787.87 1357.9,1228.03'
const RIGHT = '1666.22,2.21 3022.64,562.06 3022.64,1787.87 1666.22,1228.03'
const BASE = '1511.9,1498.61 402.95,1956.32 1597.67,2384.38 2621.78,1956.36'

/**
 * Logo oficial Drop Zone baseada no SVG enviado.
 * Mantém exatamente as três peças do arquivo original CorelDRAW.
 */
export function DropZoneLogo({
  size = 72,
  color = '#2563FF',
  secondaryColor = '#60A5FA',
  backgroundColor = 'transparent',
  animated = false,
  showContainer = false,
  style,
}: DropZoneLogoProps) {
  const progress = useRef(new Animated.Value(animated ? 0 : 1)).current

  useEffect(() => {
    if (!animated) {
      progress.setValue(1)
      return
    }
    progress.setValue(0)
    Animated.sequence([
      Animated.timing(progress, {
        toValue: 0.7,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [animated, progress])

  const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] })
  const scale = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.86, 1.05, 1] })

  return (
    <AnimatedSvg
      width={size}
      height={size * 0.79}
      viewBox={VIEWBOX}
      fill="none"
      style={[
        style,
        {
          backgroundColor,
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <Defs>
        <LinearGradient id="dzLogoGradient" x1="0" y1="0" x2="3024.12" y2="2385.97" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={secondaryColor} />
          <Stop offset="0.42" stopColor={color} />
          <Stop offset="1" stopColor="#1D4ED8" />
        </LinearGradient>
      </Defs>
      <G>
        <Polygon points={LEFT} fill="url(#dzLogoGradient)" />
        <Polygon points={RIGHT} fill="url(#dzLogoGradient)" />
        <Polygon points={BASE} fill="url(#dzLogoGradient)" />
      </G>
    </AnimatedSvg>
  )
}

export function DropZoneLogoInline({ size = 28, color = '#2563FF' }: { size?: number; color?: string }) {
  return <DropZoneLogo size={size} color={color} secondaryColor="#60A5FA" showContainer={false} />
}
