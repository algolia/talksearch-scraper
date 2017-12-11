<template>
  <div>
    <div class="header">
      <img class="logo" src="/static/logo-talksearch-line@2x.png" />
    </div>

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
      <label class="label">Speaker</label>
      <div class="control">
        <input class="input" type="text" placeholder="dotJS">
      </div>
    </div>

    <div class="field is-grouped">
      <div class="control">
        <button class="button is-link">Submit</button>
      </div>
      <div class="control">
        <button class="button is-text">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
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
