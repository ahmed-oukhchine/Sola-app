<script>
  import { Crosshair } from 'lucide-svelte'
  let { size = 28 } = $props()
</script>

<Crosshair size={size} strokeWidth={1.5} />
