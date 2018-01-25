import Vue from "vue";
import Vuex from "vuex";

// Init VueX
Vue.use(Vuex);

// Init store
const state = {
  indexerSettings: {
    speaker: {
      extract: false,
    },
    title: {
      extract: false
    }
  }
}

// Init getters
const getters = {
  getCurrentState: state => state.indexerSettings
}

// What actions can we perform on state store
const actions = {
  emptyState: (state, payload) => {
    state.commit("EMPTY_STORE", payload)
  },

  updateStore: (state, payload) => {
    state.commit("UPDATE_STORE", payload)
  }
}

// Define store mutations - all actions must pass through here
const mutations = {

  EMPTY_STORE: (state, payload) => {
    state.indexerSettings = payload
  },

  UPDATE_STORE: (state, payload) => {
    if (payload.name.includes('.')) {
      let obj = payload.name.split('.')
      let secondaryObj = new Object()
      let valueAsBoolean = (payload.val == 'true')
      secondaryObj[obj[1]] = valueAsBoolean
      state.indexerSettings[obj[0].toLowerCase()] = secondaryObj
    } else {
      state.indexerSettings[payload.name] = payload.val
    }
    
  }
}

// Export all this for use elsewhere
export default new Vuex.Store({
  state,
  getters,
  actions,
  mutations
});