<template>
  <section>
    <h2 class="title">Indexer</h2>
    <div class="columns">
      <div class="column">
        <div class="field">
          <label class="label">Youtube URL</label>
          <div class="control">
            <input class="input" type="text" placeholder="https://www.youtube.com/user/dotconferences">
          </div>
        </div>

        <div class="field">
          <label class="label">Conference Name</label>
          <div class="control">
            <input class="input" type="text" placeholder="dotJS">
          </div>
        </div>

        <div class="field">
          <label class="label">Color (optional)</label>
          <div class="control">
            <input class="input" type="text" placeholder="dotJS">
          </div>
        </div>

        <extract label="Speaker" :obj="speaker" />
        <extract label="Title" :obj="title" />

        <div class="field is-grouped">
          <div class="control">
            <button class="button is-link">Submit</button>
          </div>
          <div class="control">
            <button class="button is-text">Cancel</button>
          </div>
        </div>
      </div>
      <div class="column">
        test
      </div>
    </div>
  </section>
</template>

<script>
import Extract from './Extract.vue';

export default {
  components: {
    extract: Extract
  },
  data() {
    return {
      youtubeURL: '',
      name: '',
      speaker: {},
      title: {}
    }
  }
}
</script>
