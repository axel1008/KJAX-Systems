const periods = {
  año: 31536000,
  mes: 2592000,
  semana: 604800,
  día: 86400,
  hora: 3600,
  minuto: 60,
  segundo: 1
};

type Period = keyof typeof periods;

export function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 5) {
    return "justo ahora";
  }

  for (const periodName in periods) {
    const period = periodName as Period;
    const periodSeconds = periods[period];
    if (seconds >= periodSeconds) {
      const count = Math.floor(seconds / periodSeconds);
      const plural = count > 1 ? 's' : '';
      
      if(period === 'mes' && count > 12) {
          const years = Math.floor(count / 12);
          return `hace ${years} año${years > 1 ? 's' : ''}`;
      }
      if(period === 'mes') return `hace ${count} mes${plural}`;
      if(period === 'semana') return `hace ${count} semana${plural}`;
      if(period === 'día') return `hace ${count} día${plural}`;
      if(period === 'hora') return `hace ${count} hora${plural}`;
      if(period === 'minuto') return `hace ${count} minuto${plural}`;
      return `hace ${count} segundo${plural}`;
    }
  }

  return "justo ahora";
}