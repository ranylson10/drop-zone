export function ReputacaoBadge({ score }: { score: number }) {
 let color = 'red'

 if (score > 70) color = 'green'
 else if (score > 40) color = 'yellow'

 return (
 <div style={{
 padding: '4px 8px',
 background: color,
 color: '#000',
 fontWeight: 'bold'
 }}>
 {score}% confiável
 </div>
 )
}
