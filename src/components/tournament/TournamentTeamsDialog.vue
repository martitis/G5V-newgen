<template>
  <v-dialog v-model="open" max-width="560">
    <v-card v-if="detail" :title="$t('Tournament.ManageTeams')">
      <v-card-text>
        <div class="text-body-small text-medium-emphasis mb-2">
          {{ $t("Tournament.DisqualifyHint") }}
        </div>
        <v-list density="compact">
          <v-list-item v-for="team in detail.teams" :key="team.id">
            <template #prepend>
              <v-chip size="small" label class="mr-3">{{ team.seed }}</v-chip>
            </template>
            <v-list-item-title :class="{ 'text-medium-emphasis': team.disqualified }">
              {{ team.name }}
              <v-chip
                v-if="team.disqualified"
                color="error"
                size="x-small"
                variant="flat"
                label
                class="ml-2"
              >
                {{ $t("Tournament.DQ") }}
              </v-chip>
            </v-list-item-title>
            <template #append>
              <v-btn
                v-if="team.disqualified"
                size="small"
                variant="tonal"
                prepend-icon="mdi-account-reactivate"
                :loading="busyTeam === team.id"
                :disabled="busyTeam != null"
                @click="confirmTeam = team"
              >
                {{ $t("Tournament.Reinstate") }}
              </v-btn>
              <v-btn
                v-else
                size="small"
                variant="tonal"
                color="error"
                prepend-icon="mdi-account-cancel"
                :loading="busyTeam === team.id"
                :disabled="busyTeam != null"
                @click="confirmTeam = team"
              >
                {{ $t("Tournament.Disqualify") }}
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">{{ $t("misc.Close") }}</v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog :model-value="confirmTeam != null" max-width="480" @update:model-value="close">
      <v-card
        v-if="confirmTeam"
        :title="confirmTeam.disqualified ? $t('Tournament.Reinstate') : $t('Tournament.Disqualify')"
        :text="
          $t(
            confirmTeam.disqualified
              ? 'Tournament.ReinstateConfirm'
              : 'Tournament.DisqualifyConfirm',
            { name: confirmTeam.name }
          )
        "
      >
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmTeam = null">{{ $t("misc.Cancel") }}</v-btn>
          <v-btn
            :color="confirmTeam.disqualified ? 'primary' : 'error'"
            :loading="busyTeam != null"
            @click="apply(confirmTeam)"
          >
            {{ $t("misc.Confirm") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { tournaments } from "@/api";
import type { TournamentDetail } from "@/api/types";
import { useUiStore } from "@/stores/ui";

type Team = TournamentDetail["teams"][number];

/** Disqualify or reinstate the teams of a started tournament. */
const props = defineProps<{ detail: TournamentDetail | null }>();
const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>({ default: false });
const { t } = useI18n();
const ui = useUiStore();

const confirmTeam = ref<Team | null>(null);
const busyTeam = ref<number | null>(null);

const close = (value: boolean) => {
  if (!value) confirmTeam.value = null;
};

async function apply(team: Team) {
  if (busyTeam.value != null || !props.detail) return;
  busyTeam.value = team.id;
  try {
    const disqualify = !team.disqualified;
    const result = await tournaments.setDisqualified(
      props.detail.tournament.id,
      team.id,
      disqualify
    );
    if (result.unlinked_match_ids?.length) {
      // Their matches may still be loaded on a server: the admin decides whether to cancel them.
      ui.notify(
        t("Tournament.UnlinkedMatches", {
          name: team.name,
          ids: result.unlinked_match_ids.map((id) => `#${id}`).join(", ")
        }),
        "warning"
      );
    } else {
      ui.notify(
        t(disqualify ? "Tournament.Disqualified" : "Tournament.Reinstated", { name: team.name }),
        "success"
      );
    }
    confirmTeam.value = null;
    emit("saved");
  } catch (error) {
    ui.notifyError(error);
  } finally {
    busyTeam.value = null;
  }
}
</script>
