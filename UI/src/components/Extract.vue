<template>
  <div class="columns">
    <div class="column">
      <div class="field">
        <label class="label">{{ label }}</label>
        <div class="select">
          <select v-model="obj.extract">
            <option :value="false">false</option>
            <option :value="true">true</option>
          </select>
        </div>
      </div>
    </div>

    <div class="column">
      <div v-if="obj.extract">
        <div class="field">
          <label class="label">Regex {{ label === 'Speaker' ? '(optional)' : ''}}</label>
          <div class="control">
            <input v-model="obj.regex" class="input" type="text" placeholder="(.*) - .*">
          </div>
        </div>
        <div class="field">
          <label class="label">NbSubStr {{ label === 'Speaker' ? '(optional)' : ''}}</label>
          <div class="control">
            <input v-model="obj.nbSubStr" class="input" type="number" placeholder="1">
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    label: String,
    obj: Object
  }
}
</script>
