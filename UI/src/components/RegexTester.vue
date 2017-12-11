<template>
  <section>
    <h2 class="title">Regex Tester</h2>
    <div class="field">
      <label class="label">String</label>
      <div class="control">
        <input class="input" type="text" placeholder="Jonathan Martin: Async patterns to scale your multicore JavaScript elegantly.">
      </div>
    </div>

    <div class="field">
      <label class="label">Regex</label>
      <div class="control">
        <input class="input" type="text" placeholder="(.*) - .*">
      </div>
    </div>

    <div class="field">
      <label class="label">NbSubStr</label>
      <div class="control">
        <input class="input" type="number" placeholder="1">
      </div>
    </div>

    <div>
      Result: test
    </div>
  </section>
</template>

<script>
export default {
  data() {
    return {
    }
  }
}
</script>
