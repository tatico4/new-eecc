/**
 * InsightsGenerator - Generador de insights financieros
 */
class InsightsGenerator {
    constructor() {
        console.log('InsightsGenerator loaded');
    }

    generateInsights(transactions) {
        if (!transactions || transactions.length === 0) {
            return [];
        }

        const insights = [];

        // Insight básico sobre el gasto total
        const totalExpenses = transactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        if (totalExpenses > 0) {
            insights.push({
                icon: '💰',
                title: 'Total de gastos',
                description: `Has gastado $${totalExpenses.toLocaleString('es-CL')} en total`,
                type: 'info'
            });
        }

        return insights;
    }
}
