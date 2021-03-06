// sets globals for DB-stored, frequently accessed data
module.exports = async () => {
  [
    'LatestAddons',
    'LatestNews',
    'mdtWeekNA',
    'mdtWeekEU',
    'mdtWeekKR',
    'mdtWeekTW',
    'mdtWeekCN',
    'Top10Lists',
    'WagoOfTheMoment'
  ].forEach(async (item) => {
    var data = await SiteData.findById(item).exec()
    if (data && data.value) {
      global[item] = data.value
    }
  })  
}