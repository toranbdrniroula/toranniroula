function chartCSV(dataset) {
  const title = axis => typeof axis?.title === 'string' ? axis.title : axis?.title?.text;
  const cell = value => {
    const text = value == null ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const rows = [['Series', title(dataset.layout?.xaxis) || 'X', title(dataset.layout?.yaxis) || 'Y']];
  for (const [index, series] of dataset.data.entries()) {
    if (!Array.isArray(series.x) || !Array.isArray(series.y) || series.x.length !== series.y.length) throw new Error('Chart coordinates must have equal lengths');
    for (let i = 0; i < series.x.length; i++) rows.push([series.name || `Series ${index+1}`, series.x[i], series.y[i]]);
  }
  return rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
module.exports = { chartCSV };
