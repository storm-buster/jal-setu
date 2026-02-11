export const floodData = {
    Bihar: {
        '0m': { area: 0, population: 0, riskScore: 0, embankmentStatus: "Normal" },
        '1m': { area: 850, population: 1100000, riskScore: 6.2, embankmentStatus: "Stable" },
        '2m': { area: 1240, population: 2400000, riskScore: 8.4, embankmentStatus: "Critical" }
    },
    Uttarakhand: {
        '0m': { area: 0, population: 0, riskScore: 0, embankmentStatus: "Normal" },
        '1m': { area: 210, population: 300000, riskScore: 4.5, embankmentStatus: "Stable" },
        '2m': { area: 420, population: 800000, riskScore: 7.1, embankmentStatus: "Monitor" }
    }
} as const;
