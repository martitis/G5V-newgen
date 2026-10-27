<template>
  <div class="d-flex flex-column ga-6">
    <div v-for="section in sections" :key="section.bracket">
      <div v-if="sections.length > 1" class="text-title-medium mb-2">{{ section.title }}</div>
      <div class="bracket">
        <div v-for="column in section.rounds" :key="column.round" class="bracket-round">
          <div class="text-body-small text-medium-emphasis mb-2 round-title">
            {{ column.title }}
          </div>
          <div class="round-nodes">
            <TournamentNodeCard
              v-for="node in column.nodes"
              :key="node.key"
              :class="{ 'node-hidden': isPlaceholder(node) }"
              :aria-hidden="isPlaceholder(node) || undefined"
              :node="node"
              :teams="teams"
              :manageable="manageable"
              @create="(n) => emit('create', n)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { TournamentDetail, TournamentNode } from "@/api/types";
import TournamentNodeCard from "@/components/tournament/TournamentNodeCard.vue";
import { roundLabel } from "@/utils/tournament";

/** Elimination brackets as columns of rounds; the nodes of a round spread out to line up with the next one. */
const props = defineProps<{
  nodes: TournamentNode[];
  teams: TournamentDetail["teams"];
  manageable: boolean;
}>();
const emit = defineEmits<{ create: [node: TournamentNode] }>();
const { t } = useI18n();

/**
 * A bye (one team, no opponent) or an empty slot is never played: the team simply shows up in the next round.
 * It keeps its place, invisibly, so the rounds still line up.
 */
const isPlaceholder = (node: TournamentNode) => node.status === "bye" || node.status === "empty";

const sections = computed(() => {
  const upperRounds = Math.max(
    0,
    ...props.nodes.filter((n) => n.bracket === "upper").map((n) => n.round)
  );
  const brackets: { bracket: TournamentNode["bracket"]; title: string }[] = [
    { bracket: "upper", title: t("Tournament.Upper") },
    { bracket: "lower", title: t("Tournament.Lower") },
    { bracket: "grand_final", title: t("Tournament.GrandFinal") }
  ];
  return brackets
    .map(({ bracket, title }) => {
      const nodes = props.nodes.filter((node) => node.bracket === bracket);
      const rounds = [...new Set(nodes.map((node) => node.round))].sort((a, b) => a - b);
      return {
        bracket,
        title,
        rounds: rounds.map((round) => ({
          round,
          title: roundLabel(bracket, round, upperRounds, t),
          nodes: nodes
            .filter((node) => node.round === round)
            .sort((a, b) => a.position - b.position)
        }))
      };
    })
    .filter((section) => section.rounds.length);
});
</script>

<style scoped>
.bracket {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  padding-bottom: 8px;
}
.bracket-round {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.node-hidden {
  visibility: hidden;
}
.round-title {
  white-space: nowrap;
}
.round-nodes {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 12px;
  flex: 1;
}
</style>
