/**
 * ChartDataProcessor - Procesador de datos para gráficos
 */
class ChartDataProcessor {
    constructor() {
        console.log('ChartDataProcessor loaded');
    }

    processForChart(transactions, chartType) {
        if (!transactions || transactions.length === 0) {
            return { labels: [], datasets: [] };
        }

        switch (chartType) {
            case 'category':
                return this.processCategoryData(transactions);
            case 'trend':
                return this.processTrendData(transactions);
            default:
                return { labels: [], datasets: [] };
        }
    }

    processCategoryData(transactions) {
        const categoryTotals = {};

        transactions
            .filter(t => t.amount < 0)
            .forEach(transaction => {
                const category = transaction.category || 'Sin categoría';
                const amount = Math.abs(transaction.amount);

                if (!categoryTotals[category]) {
                    categoryTotals[category] = 0;
                }
                categoryTotals[category] += amount;
            });

        const sortedCategories = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a);

        return {
            labels: sortedCategories.map(([category]) => category),
            amounts: sortedCategories.map(([, amount]) => amount)
        };
    }

    processTrendData(transactions) {
        const monthlyData = {};

        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { expenses: 0, incomes: 0 };
            }

            if (transaction.amount < 0) {
                monthlyData[monthKey].expenses += Math.abs(transaction.amount);
            } else {
                monthlyData[monthKey].incomes += transaction.amount;
            }
        });

        const sortedMonths = Object.keys(monthlyData).sort();

        return {
            labels: sortedMonths.map(month => {
                const [year, monthNum] = month.split('-');
                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                                 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
            }),
            expenses: sortedMonths.map(month => monthlyData[month].expenses),
            incomes: sortedMonths.map(month => monthlyData[month].incomes)
        };
    }
}
