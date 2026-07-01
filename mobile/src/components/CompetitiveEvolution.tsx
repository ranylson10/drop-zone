import { StyleSheet, View } from 'react-native'
import { Card } from '@/components/Card'
import { Body, Tiny } from '@/components/AppText'
import type { EvolutionComparison, EvolutionPoint } from '@/lib/competitiveStats'
import { colors } from '@/theme/colors'

export function CompetitiveEvolution({ comparisons, points }: { comparisons: EvolutionComparison[]; points: EvolutionPoint[] }) {
  const maxKills = Math.max(1, ...points.map((point) => point.kills))

  return <View style={styles.wrap}>
    <View style={styles.comparisonGrid}>
      {comparisons.map((comparison) => {
        const positive = comparison.killsChange >= 0
        return <Card key={comparison.label} style={styles.comparison}>
          <View style={styles.comparisonTop}>
            <Tiny>{comparison.label}</Tiny>
            <Tiny style={positive ? styles.positive : styles.negative}>{positive ? '+' : ''}{comparison.killsChange.toFixed(0)}%</Tiny>
          </View>
          <Body style={styles.comparisonValue}>{comparison.currentKills} kills</Body>
          <Tiny>Anterior: {comparison.previousKills} - {comparison.currentMatches} partidas</Tiny>
        </Card>
      })}
    </View>

    <Card style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Tiny>Evolucao de kills</Tiny>
          <Body style={styles.chartTitle}>Ultimas 8 semanas</Body>
        </View>
        <Tiny>{points.reduce((sum, point) => sum + point.kills, 0)} kills</Tiny>
      </View>
      <View style={styles.chart}>
        {points.map((point) => <View key={point.label} style={styles.barColumn}>
          <Tiny style={styles.barValue}>{point.kills}</Tiny>
          <View style={styles.barTrack}>
            <View style={[styles.bar, { height: `${Math.max(5, (point.kills / maxKills) * 100)}%` }]} />
          </View>
          <Tiny style={styles.barLabel}>{point.label}</Tiny>
        </View>)}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendDot} />
        <Tiny>Barras: kills registradas em cada semana</Tiny>
      </View>
    </Card>
  </View>
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  comparisonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  comparison: { width: '31%', minWidth: 96, flexGrow: 1, gap: 3, padding: 9 },
  comparisonTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  comparisonValue: { fontSize: 16, fontWeight: '900' },
  positive: { color: '#16a34a', fontWeight: '900' },
  negative: { color: '#dc2626', fontWeight: '900' },
  chartCard: { gap: 10 },
  chartHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  chartTitle: { fontWeight: '900', fontSize: 16 },
  chart: { height: 150, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  barTrack: { width: '72%', flex: 1, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 3, backgroundColor: colors.panel2 },
  bar: { width: '100%', borderRadius: 3, backgroundColor: colors.primary },
  barValue: { color: colors.text, fontWeight: '900' },
  barLabel: { fontSize: 8, color: colors.muted },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 2, backgroundColor: colors.primary }
})
