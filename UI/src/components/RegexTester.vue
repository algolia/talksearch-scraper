<template>
  <section>
    <h2 class="title">Regex Tester</h2>
    <div class="field">
      <label class="label">String</label>
      <div class="control">
        <input v-model="string" class="input" type="text">
      </div>
    </div>

    <div class="field">
      <label class="label">Regex</label>
      <div class="control">
        <input v-model="regex" class="input" type="text" placeholder="(.*) - .*">
      </div>
    </div>

    <div class="field">
      <label class="label">NbSubStr</label>
      <div class="control">
        <input v-model="nbSubStr" class="input" type="number" placeholder="1">
      </div>
    </div>

    <div>
      <b>Result:</b> {{ string.replace(new RegExp(regex), `$${nbSubStr}`) }}
    </div>
  </section>
</template>

<script>
export default {
  data() {
    return {
      string: 'Jonathan Martin: Async patterns to scale your multicore JavaScript elegantly.',
      regex: '(.*):.*',
      nbSubStr: 1
    }
  }
}
</script>
