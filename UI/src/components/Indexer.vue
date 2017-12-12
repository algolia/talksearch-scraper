<template>
  <section>
    <h2 class="title">Indexer</h2>
    <div class="columns">
      <div class="column">
        <div class="field">
          <label class="label">Youtube URL</label>
          <div class="control">
            <input v-model="data.youtubeURL" class="input" type="text" placeholder="https://www.youtube.com/user/dotconferences">
          </div>
        </div>

        <div class="field">
          <label class="label">Conference Name</label>
          <div class="control">
            <input v-model="data.name" class="input" type="text" placeholder="dotJS">
          </div>
        </div>

        <div class="field">
          <label class="label">Languages separated by a comma (optional, default 'en')</label>
          <div class="control">
            <input v-model="data.lang" class="input" type="text" placeholder="fr,en">
          </div>
        </div>

        <div class="field">
          <label class="label">Color (optional)</label>
          <div class="control">
            <input v-model="data.accentColor" class="input" type="text" placeholder="yellow">
          </div>
        </div>

        <extract label="Speaker" :obj="data.speaker" />
        <extract label="Title" :obj="data.title" />

        <div class="field">
          <label class="label">API token</label>
          <div class="control">
            <input v-model="token" class="input" type="text">
          </div>
        </div>

        <div class="field is-grouped">
          <div class="control">
            <button v-if="!isLoading" @click="index" class="button is-link">Submit</button>
            <a v-else class="button is-link is-loading">Loading</a>
          </div>
        </div>
      </div>
      <div class="column">
        <label class="label">API Response</label>
        <div class="indexing" v-if="isLoading">
          Indexing... Wait a moment.
        </div>
        <pre><code>{{ response.data }}</code></pre>
      </div>
    </div>
  </section>
</template>

<script>
import Extract from './Extract.vue';
import axios from 'axios';

export default {
  components: {
    extract: Extract
  },

  data() {
    return {
      data: {
        youtubeURL: '',
        name: '',
        accentColor: '',
        lang: '',
        speaker: {
          extract: false,
          regex: '',
          nbSubStr: ''
        },
        title: {
          extract: false,
          regex: '',
          nbSubStr: ''
        },
      },
      token: '',
      response: {},
      isLoading: false
    }
  },

  methods: {
    async index() {
      this.isLoading = true;
      const data = this.data;
      this.response = await axios({
        method: 'post',
        url: `${process.env['API_URL']}/index`,
        data,
        withCredentials: true,
        auth: {
          username: null,
          password: this.token
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      this.isLoading = false;
    }
  }
}
</script>

<style>
.indexing {
  margin-bottom: 20px;
}
</style>
