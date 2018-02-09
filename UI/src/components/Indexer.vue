<template>
  <section>
    <div class="columns">
      <div class="column">
        <h2 class="title">Indexer</h2>

        <div class="tabs is-toggle is-fullwidth">
          <ul>
            <li :class="{ 'is-active': pages.index }">
              <a @click="changePage('index')">
                <span>Index</span>
              </a>
            </li>
            <li :class="{ 'is-active': pages.reindexOne }">
              <a @click="changePage('reindexOne')">
                <span>Reindex an index</span>
              </a>
            </li>
            <li :class="{ 'is-active': pages.reindex }">
              <a @click="changePage('reindex')">
                <span>Reindex everything</span>
              </a>
            </li>
          </ul>
        </div>

        <div class="field">
          <label class="label">API token</label>
          <div class="control">
            <input v-model="token" @input="updateStore" id="token" class="input" type="password" required>
          </div>
        </div>

        <div v-if="pages.index">
          <div class="field">
            <label class="label">Youtube URL (Can be a playlist or a channel URL)</label>
            <div class="control">
              <input v-model="data.youtubeURL" @input="updateStore" id="youtubeURL" class="input" type="url" placeholder="https://www.youtube.com/user/dotconferences" required>
            </div>
          </div>

          <div class="field">
            <label class="label">Conference Name</label>
            <div class="control">
              <input v-model="data.name" @input="updateStore" id="name" class="input" type="text" placeholder="dotJS" required>
            </div>
          </div>

          <div class="field">
            <label class="label">Custom Index Name / Add to existing index</label>
            <div class="control">
              <input v-model="data.customIndexName" @input="updateStore" id="customIndexName" class="input" type="text" placeholder="dotJSConfs" required>
            </div>
          </div>

          <div class="field">
            <label class="label">Check for duplicate index</label>
            <div class="select">
              <select v-model="data.checkForDuplicates" @input="updateStore" id="checkForDuplicates">
                <option :value="false">No</option>
                <option :value="true">Yes</option>
              </select>
            </div>
          </div>

          <div class="field">
            <label class="label">Languages separated by a comma (optional, default 'en')</label>
            <div class="control">
              <input v-model="data.lang" @input="updateStore" id="lang" class="input" type="text" placeholder="fr,en">
            </div>
          </div>

          <div class="field">
            <label class="label">Color (optional)</label>
            <div class="control">
              <input v-model="data.accentColor" @input="updateStore" id="accentColor" class="input" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="yellow">
            </div>
          </div>

          <extract label="Speaker" :obj="data.speaker" />
          <extract label="Title" :obj="data.title" />

          <div class="field is-grouped">
            <div class="control">
              <button v-if="!isLoading" @click="index" class="button is-link">Submit</button>
              <a v-else class="button is-link is-loading">Loading</a>
            </div>
          </div>
        </div>

        <div v-if="pages.reindexOne">
          <div class="field">
            <label class="label">Index name</label>
            <div class="control">
              <input v-model="indexName" @input="updateStore" id="indexName" class="input" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Algolia-playlist-PLuHdbqhRgWHJg9eOFCl5dgLvVjd_DFz8O" required>
            </div>
          </div>

          <div class="field is-grouped">
            <div class="control">
              <button v-if="!isLoading" @click="reindex" class="button is-link">Reindex this specific index</button>
              <a v-else class="button is-link is-loading">Loading</a>
            </div>
          </div>
        </div>

        <div v-if="pages.reindex">
          <div class="field is-grouped">
            <div class="control">
              <button v-if="!isLoading" @click="reindex" class="button is-link">Reindex all videos</button>
              <a v-else class="button is-link is-loading">Loading</a>
            </div>
          </div>
        </div>
      </div>
      <div class="column">
        <h2 class="title">API Response</h2>
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
    extract: Extract,
  },

  data() {
    // Define the store
    const store = this.$store.state.indexerSettings;

    // Return a data object to bind to elements, and pull from store if object.key is set
    return {
      data: {
        youtubeURL: store.youtubeURL,
        name: store.name,
        customIndexName: store.customIndexName,
        checkForDuplicates: store.checkForDuplicates,
        accentColor: store.accentColor,
        lang: store.lang,
        speaker: {
          extract: store.speaker.extract,
          regex: '',
          nbSubStr: '',
        },
        title: {
          extract: store.title.extract,
          regex: '',
          nbSubStr: '',
        },
      },
      token: store.token,
      response: {},
      isLoading: false,
      pages: {
        index: true,
        reindexOne: false,
        reindex: false,
      },
      indexName: store.title.indexName,
    };
  },

  methods: {

    updateStore(e){
      const payload = {
        name: e.target.id,
        val: e.target.value
      }
      this.$store.dispatch('updateStore', payload);
    },

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
          password: this.token,
        },
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      this.isLoading = false;
      this.$store.dispatch('emptyState', {});
    },

    async reindex() {
      if (!this.indexName) {
        const ask = confirm('Are you sure you want to reindex everything?');
        if (!ask) return;
      }
      this.isLoading = true;
      this.response = await axios({
        method: 'post',
        url: `${process.env['API_URL']}/reindex`,
        data: {
          indexName: this.indexName,
        },
        withCredentials: true,
        auth: {
          username: null,
          password: this.token,
        },
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      this.isLoading = false;
    },

    changePage(newPage) {
      for (const page in this.pages) {
        this.pages[page] = false;
      }
      
      this.indexName = '';
      this.pages[newPage] = true;
    },
  },
};
</script>

<style>
.indexing {
  margin-bottom: 20px;
}
</style>
