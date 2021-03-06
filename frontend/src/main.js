require('es6-promise').polyfill()
window.prerenderReady = false
/**
 * Setup global functions & variables in window
 */
window.setCookie = function (name, value, days) {
  var expires = ''
  if (days) {
    var date = new Date()
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
    expires = '; expires=' + date.toUTCString()
  }
  if (window.location.hostname.match(/wago\.io/)) {
    document.cookie = name + '=' + value + expires + '; domain=.wago.io; path=/'
  }
  // if testing locally
  else {
    document.cookie = name + '=' + value + expires + '; path=/'
  }
}

window.readCookie = function (name) {
  var nameEQ = name + '='
  var ca = document.cookie.split(';')
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

window.clearCookie = function (name) {
  window.setCookie(name, '', -1)
}

window.locales = require('../../i18nLocaleConfig').locales

document.body.className = 'theme-' + (window.readCookie('theme') || 'dark')

// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'

// setup Vuex state
import Vuex from 'vuex'
Vue.use(Vuex)
const store = new Vuex.Store({
  state: {
    locale: window.readCookie('locale') || 'en-US',
    user: {},
    loggedIn: false,
    wotm: {},
    wago: {},
    snackBarText: 'alert',
    loginRedirect: '/',
    theme: window.readCookie('theme') || 'dark',
    editorTheme: window.readCookie('editorTheme') || 'tomorrow',
    MDTTable: false,
    MDTWeek: 0,
    pageInfo: {
      title: 'Import',
      description: 'Database of sharable World of Warcraft addon elements',
      image: 'https://wago.io/media/favicon/apple-touch-icon-180x180.png'
    }
  },
  mutations: {
    // store.commit('setLocale', 'en-US')
    setLocale (state, locale) {
      if (locale.indexOf('-') === 2) {
        // locale already in lang-region format
      }
      else if (locale === locale.toUpperCase()) {
        // locale is a region
        locale = state.locale.split('-')[0] + '-' + locale
      }
      else if (locale === locale.toLowerCase()) {
        // locale is a language
        locale = locale + '-' + state.locale.split('-')[1]
      }
      else {
        // what is this!
        var e = {name: 'UnknownLocale', message: locale}
        throw e
      }

      // is this a supported locale?
      var supported
      window.locales.forEach((item) => {
        if (item.code === locale) {
          supported = true
        }
      })

      // if not then keep the language but discard the user's region for i8n purposes
      var setLocale
      if (!supported) {
        var lng = locale.split('-')[0]
        window.locales.forEach((item) => {
          if (setLocale) return

          // if match found use this
          if (item.code.split('-')[0] === lng) {
            setLocale = item.code
            return
          }
        })
      }
      else {
        setLocale = locale
      }
      state.locale = setLocale
      window.i18next.changeLanguage(setLocale)
      window.setCookie('locale', setLocale, 365)
      location.reload()
    },

    // store.commit('setUser', {JSON user object from API...})
    setUser (state, user) {
      if (user && user.UID) {
        state.loggedIn = true
      }
      else {
        state.loggedIn = false
      }
      state.user = JSON.parse(JSON.stringify(user))
      if (state.user.config && state.user.config.theme) {
        window.setCookie('theme', state.user.config.theme, 365)
        document.body.className = 'theme-' + state.user.config.theme
      }
      if (state.user.config && state.user.config.editor) {
        window.setCookie('editor', state.user.config.editor, 365)
      }
    },

    userClearMention (state, commentID) {
      if (!state.user || !state.user.UID) {
        return
      }
      for (var i = 0; i < state.user.unreadMentions.length; i++) {
        if (state.user.unreadMentions[i]._id === commentID) {
          state.user.unreadMentions.splice(i, 1)
        }
      }
    },

    userSearchOption (state, data) {
      if (!state.user) {
        return
      }
      state.user.config.searchOptions[data.field] = data.value
    },

    setPageInfo (state, page) {
      if (!page.title) {
        page.title = state.pageInfo.title
      }
      if (page.description) {
        // remove bbcode
        var plaintext = page.description.replace(/\[\/?(?:b|center|code|color|face|font|i|justify|large|left|li|noparse|ol|php|quote|right|s|size|small|sub|sup|taggeduser|table|tbody|tfoot|td|th|tr|u|url|\*)*?.*?\]/g, '').replace(/\n/g, ' ')

        // if shortening the text
        if (plaintext.length > 160) {
          // truncate to length
          plaintext = plaintext.substr(0, 160)
          // truncate to last word
          plaintext = plaintext.substr(0, Math.min(plaintext.length, plaintext.lastIndexOf(' ')))
        }
        page.description = plaintext
      }
      else {
        page.description = 'Database of sharable World of Warcraft addon elements'
      }
      if (!page.image) {
        page.image = 'https://wago.io/media/favicon/apple-touch-icon-180x180.png'
      }
      if (page.unlisted) {
        page.robots = 'noindex,nofollow'
      }
      else {
        page.robots = 'index,follow'
      }
      state.pageInfo = JSON.parse(JSON.stringify(page))
      window.prerenderReady = true
    },

    setWotm (state, wotm) {
      state.wotm = JSON.parse(decodeURIComponent(wotm))
    },
    setWago (state, wago) {
      state.wago = wago
    },
    setWagoJSON (state, json) {
      state.wago.code.json = json
    },
    setMDTWeek (state, week) {
      state.MDTWeek = week
    },
    setLoginRedirect (state, path) {
      state.loginRedirect = path
    },
    setEditorTheme (state, theme) {
      window.setCookie('editorTheme', theme, 365)
      state.editorTheme = theme
      Vue.set(state.user.config, 'editor', theme)
    },
    setTheme (state, theme) {
      window.setCookie('theme', theme)
      document.body.className = 'theme-' + theme
      Vue.set(state.user.config, 'theme', theme, 365)
      state.theme = theme
    },

    saveMDT (state, table) {
      state.mdtDungeonTable = table
    }
  },
  getters: {
    i18nLanguage (state) {
      return state.locale.split('-')[0]
    },
    i18nRegion (state) {
      return state.locale.split('-')[1]
    }
  }
})

import App from './App'

// load router
import VueRouter from 'vue-router'
Vue.use(VueRouter)
import routes from './router.js'
const router = new VueRouter(
  routes
)
Vue.router = router
// called before any route changes
router.beforeEach((to, from, next) => {
  // scroll to top of page
  if (!window.preventScroll) {
    window.scrollTo(0, 0)
  }

  // close mobile nav
  if (Vue.$refs && Vue.$refs['mobile-sidebar']) {
    Vue.$refs['mobile-sidebar'].close()
  }

  if (to.path === '/login') {
    if (from.path === '/') {
      store.commit('setLoginRedirect', '/account')
    }
    else {
      store.commit('setLoginRedirect', from.path)
    }
  }

  // hide any open menus on navigation
  var needClick = document.querySelectorAll('.md-menu-backdrop')
  needClick.forEach((el) => {
    el.click()
  })

  // beta server require login (if JS does not know user is logged in when visiting the page then wait for whoami request handled in App.vue)
  if (window.requireBetaAccess && (!store.state.user.access || !store.state.user.access.beta) && !to.path.match(/^\/(login|auth)/)) {
    router.replace('/login')
    return next(false)
  }

  // allow route change
  next()

  // disallow route change
  // next(false)
})

// setup vue-meta for header
import Meta from 'vue-meta'
Vue.use(Meta)

// load vddl (drag drop) component
import Vddl from 'vddl'
Vue.use(Vddl)

// load v-show-slide component
import VShowSlide from 'v-show-slide'
Vue.use(VShowSlide)

// setup vue material
import VueMaterial from 'vue-material'
import 'vue-material/dist/vue-material.css'
Vue.use(VueMaterial)
Vue.material.registerTheme({
  default: {
    primary: 'black'
  }
})
Vue.material.registerTheme('dark', {
  primary: {
    color: 'grey',
    hue: '800'
  },
  accent: {
    color: 'grey',
    hue: 300
  }
})

var dataServers
if (process.env.NODE_ENV === 'development') {
  dataServers = ['http://ubuntu:3030']
}
else {
  // using round robin client-based load balancing
  // dataServers = getServersByCountry(window.cfCountry) // attempt to detect country by cloudflare and assign regional data servers when available
  dataServers = ['https://data1.wago.io', 'https://data2.wago.io']
}
dataServers = dataServers.sort(() => {
  return 0.5 - Math.random()
})

import axios from 'axios'
import VueAxios from 'vue-axios'
Vue.use(VueAxios, axios)
// set default options
// TODO: switch axios auth'ing to fetch
Vue.axios.defaults.baseURL = dataServers[0]
Vue.axios.defaults.withCredentials = true // to use cookies with CORS
if (window.readCookie('token')) {
  Vue.axios.defaults.headers = { 'x-auth-token': window.readCookie('token') }
}

axios.interceptors.response.use(function (response) {
  // if logging in
  if (response.data.login && response.data.token && response.data.user) {
    window.setCookie('token', response.data.token, 365)
    Vue.axios.defaults.headers = { 'x-auth-token': response.data.token }
    store.commit('setUser', response.data.user)
    router.replace(store.loginRedirect || '/account')
  }

  return response
})

// setup http fetch helper
const http = {
  install: function (Vue, options) {
    Vue.prototype.http = {
      config: function (url) {
        var headers = {}

        // add jwt token
        if (window.readCookie('token')) {
          headers['x-auth-token'] = window.readCookie('token')
        }

        return {
          headers: headers,
          credentials: 'include',
          mode: 'cors'
        }
      },

      get: function (url, params) {
        // add referer for analytics
        if (document.referer && !document.referer.match(/^https:\/\/wago.io/) && !url.match(/^\/account\//)) {
          params = params || {}
          params._ref = document.referer
          document.referer = null
        }

        // prepend API server
        var host
        if (!url.match(/^http/)) {
          host = dataServers.shift()
          url = host + url
          dataServers.push(host)
        }

        // append querystring to url
        if (params) {
          if (!url.match(/\?/)) {
            url = url + '?'
          }
          else {
            url = url + '&'
          }
          url = url + Object.keys(params).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&')
        }

        // ajax away!
        return fetch(url, this.config(url)).then((res) => {
          this.interceptHeaders(res)
          return res.json()
        }).then((json) => {
          this.interceptJSON(json)
          return json
        }).catch((err) => {
          // if we couldn't reach the server
          if (host && dataServers.length > 1) {
            // remove server from server list and try again
            dataServers.splice(dataServers.indexOf(host), 1)
            url = url.replace(host, dataServers[0])
            return this.get(url, params)
          }
          else {
            console.log('No servers available', err)
            window.eventHub.$emit('showSnackBar', i18next.t('Error could not reach data server'))
          }
        })
      },
      post: function (url, params) {
        // prepend API server
        if (!url.match(/^http/)) {
          var host = dataServers.shift()
          url = host + url
          dataServers.push(host)
        }

        if (!params) {
          params = {}
        }

        var config = this.config()
        config.method = 'post'
        config.headers['Accept'] = 'application/json'
        config.body = JSON.stringify(params)

        // ajax away!
        return fetch(url, config).then((res) => {
          this.interceptHeaders(res)
          return res.json()
        }).then((json) => {
          this.interceptJSON(json)
          return json
        }).catch((err) => {
          if (host && dataServers.length > 1) {
            dataServers.splice(dataServers.indexOf(host), 1)
            url = url.replace(host, dataServers[0])
            this.get(url, params)
          }
          else {
            console.log(url, err)
            window.eventHub.$emit('showSnackBar', i18next.t('Error could not reach data server'))
          }
        })
      },
      upload: function (url, file, params) {
        // prepend API server
        if (!url.match(/^http/)) {
          var host = dataServers.shift()
          url = host + url
          dataServers.push(host)
        }

        if (!params) {
          params = {}
        }

        var _t = this
        return new Promise((resolve, reject) => {
          var reader = new FileReader()
          reader.onload = function (event) {
            params.file = event.target.result
            resolve(_t.post(url, params))
          }
          reader.readAsDataURL(file)
        })
      },
      // PostToWACompanion: function (action, id) {
      //   var e = document.createElement('a')
      //   e.id = 'sendToCompanion'
      //   e.href = `weakauras-companion://wago/${action}/${id}`
      //   document.getElementsByTagName('body')[0].appendChild(e)
      //   e.click()
      //   e.parentNode.removeChild(e)
      //   return fetch(`weakauras-companion://wago/${action}/${id}`, {
      //     mode: 'no-cors',
      //     cache: 'no-cache'
      //   })
      //   .then((res) => {
      //     return res.json()
      //   }).then((json) => {
      //     if (json.success) {
      //       window.eventHub.$emit('showSnackBar', i18next.t('WeakAura successfully sent to Companion App'))
      //     }
      //     else {
      //       window.eventHub.$emit('showSnackBar', i18next.t('An error has occurred'))
      //     }
      //   }).catch((err) => {
      //     console.log(err)
      //     window.eventHub.$emit('showSnackBar', i18next.t('Error could not reach the WeakAura Companion App, are you sure it is running?'))
      //   })
      // },
      interceptHeaders: function (res) {
        for (var pair of res.headers.entries()) {
          switch (pair[0]) {
            case 'wotm':
              store.commit('setWotm', pair[1])
              break
          }
        }
      },
      interceptJSON: function (json) {
        if (json.login && json.token && json.user) {
          window.setCookie('token', json.token, 365)
          store.commit('setUser', json.user)
          router.replace(store.loginRedirect || '/account')
        }
        else if (json.guest === true) {
          // session expired or no session at all, clear cookies
          window.clearCookie('token')
          window.clearCookie('theme')
          Vue.axios.defaults.headers = { }
        }

        if (json.mdtWeek) {
          store.commit('setMDTWeek', json.mdtWeek)
        }
      }
    }
  }
}
Vue.use(http)

var i18next = window.i18next = require('i18next')
import VueI18Next from '@panter/vue-i18next'
Vue.use(VueI18Next)

import XHR from 'i18next-xhr-backend'
i18next.use(XHR)
  .init({
    lng: store.state.locale,
    fallbackLng: 'en-US',
    ns: ['translation', 'warcraft'],
    load: 'currentOnly',
    returnEmptyString: false,
    backend: {
      loadPath: '/static/i18n/[-lng-]/[-ns-].json',
      allowMultiLoading: false,
      crossDomain: false
    },
    interpolation: {
      prefix: '[-',
      suffix: '-]'
    }
  })

Vue.config.productionTip = false
const i18n = new VueI18Next(i18next)

// setup momentjs
Vue.use(require('vue-moment'))

// scrollTo
Vue.use(require('vue-scrollto'), {
  offset: -90,
  duration: 350
})

// since b.net only allows a single callback per app we need a second key for a beta app
var bnetClientID
if (window.location.hostname === 't1000.wago.io') {
  bnetClientID = 'knqu8yfycxhjzuufny6vja3z3jyzap8s'
}
else {
  bnetClientID = '814f698f09d446a8b5ba7b1b6123fb3f'
}

// setup third party oauth authentication
import VueAuth from '@websanova/vue-auth'
Vue.use(VueAuth, {
  auth: require('@websanova/vue-auth/drivers/auth/bearer.js'),
  http: require('@websanova/vue-auth/drivers/http/axios.1.x.js'),
  router: require('@websanova/vue-auth/drivers/router/vue-router.2.x.js'),
  fetchData: {enabled: false},
  battlenetData: {url: 'auth/battlenet', method: 'POST', redirect: '/account'},
  battlenetOauth2Data: {
    url: 'https://us.battle.net/oauth/authorize',
    redirect: function () {
      return this.options.getUrl() + '/auth/battlenet'
    },
    clientId: bnetClientID,
    scope: 'wow.profile'
  },
  battlenetCNData: {url: 'auth/battlenetCN', method: 'POST', redirect: '/account'},
  battlenetCNOauth2Data: {
    url: 'https://www.battlenet.com.cn/oauth/authorize',
    redirect: function () {
      return this.options.getUrl() + '/auth/battlenetCN'
    },
    clientId: bnetClientID,
    scope: 'wow.profile'
  },
  discordData: {url: 'auth/discord', method: 'POST', redirect: '/account'},
  discordOauth2Data: {
    url: 'https://discordapp.com/api/oauth2/authorize',
    redirect: function () {
      return this.options.getUrl() + '/auth/discord'
    },
    clientId: '314531302059540490',
    scope: 'identify'
  },
  googleData: {url: 'auth/google', method: 'POST', redirect: '/account'},
  googleOauth2Data: {
    url: 'https://accounts.google.com/o/oauth2/auth',
    redirect: function () {
      return this.options.getUrl() + '/auth/google'
    },
    clientId: '1066257896372-gn76b3s7sfra5s46861urve9rved56vd.apps.googleusercontent.com',
    scope: 'profile openid'
  },
  patreonData: {url: 'auth/patreon', method: 'POST', redirect: '/account'},
  patreonOauth2Data: {
    url: 'https://www.patreon.com/oauth2/authorize',
    redirect: function () {
      return this.options.getUrl() + '/auth/patreon'
    },
    clientId: '-lUfSkaxFXmH-l0EBKFchZ3LmYGnjwKSL-93pVhZm2qiQXhZmaaNMyx8LuS1OiZ-',
    scope: 'users pledges-to-me'
  }
})

// setup global components
Vue.component('ui-image', require('./components/UI/Image.vue'))
Vue.component('ui-loading', require('./components/UI/Loading.vue'))
Vue.component('ui-warning', require('./components/UI/Warning.vue'))

window.braceRequires = function () {
  // ace editor themes and file types
  require('brace/mode/html')
  require('brace/mode/json')
  require('brace/mode/lua')
  // bright themes
  require('brace/theme/chrome')
  require('brace/theme/clouds')
  require('brace/theme/crimson_editor')
  require('brace/theme/dawn')
  require('brace/theme/dreamweaver')
  require('brace/theme/eclipse')
  require('brace/theme/github')
  require('brace/theme/iplastic')
  require('brace/theme/solarized_light')
  require('brace/theme/textmate')
  require('brace/theme/tomorrow')
  require('brace/theme/xcode')
  require('brace/theme/kuroir')
  require('brace/theme/katzenmilch')
  require('brace/theme/sqlserver')
  // dark themes
  require('brace/theme/ambiance')
  require('brace/theme/chaos')
  require('brace/theme/clouds_midnight')
  require('brace/theme/cobalt')
  require('brace/theme/idle_fingers')
  require('brace/theme/kr_theme')
  require('brace/theme/merbivore')
  require('brace/theme/merbivore_soft')
  require('brace/theme/mono_industrial')
  require('brace/theme/monokai')
  require('brace/theme/pastel_on_dark')
  require('brace/theme/solarized_dark')
  require('brace/theme/terminal')
  require('brace/theme/tomorrow_night')
  require('brace/theme/tomorrow_night_blue')
  require('brace/theme/tomorrow_night_bright')
  require('brace/theme/tomorrow_night_eighties')
  require('brace/theme/twilight')
  require('brace/theme/vibrant_ink')
}

// setup Konva
import VueKonva from 'vue-konva'
Vue.use(VueKonva)

/* eslint-disable no-unused-vars */
window.eventHub = new Vue()
var VueApp = new Vue({
  el: '#app',
  router,
  http,
  store,
  i18n,
  template: '<App/>',
  components: { App }
})
