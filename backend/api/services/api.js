/**
 * API requests for WA Updater app or other uses
 */

module.exports = function (fastify, opts, next) {
  // returns array of latest versions details of supported addons
  fastify.get('/addons', (req, res) => {
    res.cache(300).send(global.LatestAddons)
  })

  // returns basic data of requested weakauras; WA Companion uses to check for updates
  fastify.get('/check/weakauras', async (req, res) => {
    if (!req.query.ids) {
      return res.code(404).send({error: "page_not_found"})
    }
    
    var ids = req.query.ids.split(',').slice(0, 200)
    var wagos = []
    var docs = await WagoItem.find({'$or' : [{_id: ids}, {custom_slug: ids}], deleted: false, type: 'WEAKAURAS2'}).populate('_userId').exec()
    await Promise.all(docs.map(async (doc) => {
      if (doc.private && (!req.user || !req.user._id.equals(doc._userId._id))) {
        return
      }
      var wago = {}
      wago._id = doc._id
      wago.name = doc.name      
      wago.slug = doc.custom_slug || doc._id
      wago.url = doc.url
      wago.created = doc.created
      wago.modified = doc.modified  
      wago.forkOf = doc.fork_of
      if (doc._userId) {
        wago.username = doc._userId.account.username
      }
  
      // if requested by WA Companion App, update installed count
      if (req.headers['identifier'] && req.headers['user-agent'].match(/Electron/)) {
        const ipAddress = req.raw.ip
        WagoFavorites.addInstall(doc, 'WA-Updater-' + req.headers['identifier'], ipAddress)
      }

      if (doc.latestVersion.iteration && doc.regionType) {
        wago.version = doc.latestVersion.iteration
        wago.versionString = doc.latestVersion.versionString
        if (typeof doc.latestVersion.changelog === 'string') {
          doc.latestVersion.changelog = JSON.parse(doc.latestVersion.changelog)
        }
        wago.changelog = doc.latestVersion.changelog
        wago.regionType = doc.regionType
        wagos.push(wago)
        return
      }
  
      var code = await WagoCode.lookup(wago._id)
      const json = JSON.parse(code.json)
      doc.regionType = json.d.regionType
      wago.regionType = doc.regionType
      
      wago.version = code.version
      var versionString = code.versionString
      if (versionString !== '1.0.' + (code.version + 1) && versionString !== '0.0.' + code.version) {
        versionString = versionString + '-' + code.version
      }
      wago.versionString = versionString
      wago.changelog = code.changelog
      wagos.push(wago)
      
      doc.latestVersion.iteration = code.version
      doc.latestVersion.versionString = versionString
      doc.latestVersion.changelog = code.changelog
      doc.save()
      return
    }))
    res.send(wagos)
  })

  // returns raw encoded string for requested import
  fastify.get('/raw/encoded', async (req, res) => {
    if (!req.query.id) {
      return res.code(404).send({error: "page_not_found"})
    }
  
    var wago = await WagoItem.lookup(req.query.id)
    if (!wago) {
      return res.code(404).send({error: "page_not_found"})
    }
    else if (wago.private && (!req.user || !req.user._id.equals(wago._userId))) {
      return res.code(401).send({error: "import_is_private"})
    }
    var code = await WagoCode.lookup(wago._id, req.query.version)
    if (!code || !code.encoded) {
      return res.code(404).send({error: "page_not_found"})
    }
    if (wago.type === 'WEAKAURA' && code.json && code.json.match(commonRegex.WeakAuraBlacklist)) {
      return res.code(409).send({error: "malicious_code_found"})
    }
    if (code.versionString !== req.query.version) {
      return res.code(302).redirect(`/api/raw/encoded?id=${req.query.id}&version=${code.versionString}`)
    }
    res.header('Content-Type', 'text/plain')
    if (wago.type === 'WEAKAURA' && !code.encoded.match(/^!/)) {
      code.encoded = await lua.JSON2WeakAura(code.json)
      if (code.encoded) {
        code.save()
      }
    }
    return res.cache(86400).send(code.encoded)
  })

  next()
}