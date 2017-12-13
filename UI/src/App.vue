<template>
  <div class="container">
    <div class="header">
      <img class="logo" src="/static/logo-talksearch-line@2x.png" />
    </div>
    <div class="tabs is-centered">
      <ul>
        <li :class="{ 'is-active': indexerPage }">
          <a @click="changePage(true)">Indexer</a>
        </li>
        <li :class="{ 'is-active': !indexerPage }">
          <a @click="changePage(false)">Regex Tester</a>
        </li>
      </ul>
    </div>
    <indexer v-if="indexerPage" />
    <regex-tester v-else />
  </div>
</template>

<script>
import RegexTester from './components/RegexTester.vue';
import Indexer from './components/Indexer.vue';

export default {
  components: {
    'regex-tester': RegexTester,
    indexer: Indexer
  },
  data() {
    return {
      indexerPage: true
    }
  },
  methods: {
    changePage(indexerPage) {
      this.indexerPage = indexerPage;
    }
  }
}
</script>

<style>
.header {
  margin-top: 50px;
  text-align: center;
  margin-bottom: 20px;
}

.logo {
  width: 400px;
}

section {
  margin-bottom: 50px;
}
</style>
