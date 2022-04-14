import { ActorPF2e } from "../../base";
import { CharacterPF2e } from "@actor/character";
import { Abilities } from "@actor/creature/data";
import { ABILITY_ABBREVIATIONS } from "@actor/data/values";
import { AbilityString } from "@actor/data/base";
import { AncestryPF2e, BackgroundPF2e, ClassPF2e } from "@item";

type BoostFlawState = "unavailable" | "boosted" | "locked" | "available" | "flawed" | "flawed-locked" | "neutral";
type BoostFlawRow = Record<AbilityString, BoostFlawState>;

interface PopupData extends DocumentSheetData<ActorPF2e> {
    abilities?: Record<AbilityString, string>;
    abilityScores?: Abilities;
    manual?: boolean;
    ancestry?: Embedded<AncestryPF2e> | null;
    ancestryBoosts?: { boosts: BoostFlawRow; remaining: number };
    background?: Embedded<BackgroundPF2e> | null;
    backgroundBoosts?: { boosts: BoostFlawRow; remaining: number };
    class?: Embedded<ClassPF2e> | null;
    keyOptions?: AbilityString[];
    levelBoosts?: Record<number, AbilityString[]>;
}

interface PopupFormData extends FormData {
    actorIds: string[];
    breakCoins: boolean;
}

type PopupOptions = ActorSheetOptions;

/**
 * @category Other
 */
export class AbilityBuilderPopup extends DocumentSheet<ActorPF2e, PopupOptions> {
    static override get defaultOptions(): PopupOptions {
        const options: PopupOptions = {
            ...super.defaultOptions,
            token: null,
            id: "ability-builder",
            classes: ["loot-actor-popup"],
            title: game.i18n.localize("PF2E.AbilityScoresHeader"),
            template: "systems/pf2e/templates/actors/ability-builder.html",
            width: "auto",
        };
        return options;
    }

    override async _updateObject(_event: Event, _formData: Record<string, unknown> & PopupFormData): Promise<void> {}

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        const thisActor = this.object;
        if (!(thisActor instanceof CharacterPF2e)) {
            return;
        }

        $html.find("div[data-tooltip-content]").tooltipster({
            contentAsHTML: true,
            debug: BUILD_MODE === "development",
            interactive: true,
            side: ["bottom"],
            theme: "crb-hover",
        });

        $html.find<HTMLInputElement>("input[type=text], input[type=number]").on("focus", (event) => {
            event.currentTarget.select();
        });

        $html.find<HTMLInputElement>('input[name="data.build.manual"]').on("change", async (event) => {
            if (event.originalEvent instanceof Event) {
                await thisActor.toggleAbilityManagement();
            }
        });

        $html.find('button[data-action="ancestry-boost"]').on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");

            const boostToRemove = Object.entries(thisActor.ancestry?.data.data.boosts ?? {}).find(
                ([_, b]) => b.selected === ability
            );
            if (boostToRemove) {
                await thisActor.ancestry?.update({
                    [`data.boosts.${boostToRemove[0]}.selected`]: null,
                });
                return;
            }

            const freeBoost = Object.entries(thisActor.ancestry?.data.data.boosts ?? {}).find(
                ([_, b]) => !b.selected && b.value.length > 0
            );
            if (freeBoost) {
                await thisActor.ancestry?.update({
                    [`data.boosts.${freeBoost[0]}.selected`]: ability,
                });
            }
        });

        $html.find('button[data-action="background-boost"]').on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");

            const boostToRemove = Object.entries(thisActor.background?.data.data.boosts ?? {}).find(
                ([_, b]) => b.selected === ability
            );
            if (boostToRemove) {
                await thisActor.background?.update({
                    [`data.boosts.${boostToRemove[0]}.selected`]: null,
                });
                return;
            }

            const freeBoost = Object.entries(thisActor.background?.data.data.boosts ?? {}).find(
                ([_, b]) => !b.selected && b.value.length > 0
            );
            if (freeBoost) {
                await thisActor.background?.update({
                    [`data.boosts.${freeBoost[0]}.selected`]: ability,
                });
            }
        });

        $html.find('button[data-action="class-keyAbility"]').on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");
            await thisActor.class?.update({
                [`data.keyAbility.selected`]: ability,
            });
        });

        $html.find('button[data-action="level"]').on("click", async (event) => {
            const ability: AbilityString = $(event.currentTarget).attr("data-ability") as AbilityString;
            const level = ($(event.currentTarget).attr("data-level") ?? "1") as "1" | "5" | "10" | "15" | "20";
            let boosts = thisActor.data._source.data.build?.abilities?.boosts?.[level] ?? [];
            if (boosts.includes(ability)) {
                boosts = boosts.filter((a) => a !== ability);
            } else {
                boosts.push(ability);
            }
            await thisActor.update(
                {
                    [`data.build.abilities.boosts.${level}`]: boosts,
                },
                { diff: false } // arrays are stupid
            );
        });

        $html.find<HTMLInputElement>("input[data-property]").on("blur", async (event) => {
            const $input = $(event.target);
            const propertyPath = $input.attr("data-property") ?? "";
            await thisActor.update({
                [propertyPath]: $input.val(),
            });
        });
    }

    protected override async _onSubmit(
        event: Event,
        options: OnSubmitFormOptions = {}
    ): Promise<Record<string, unknown>> {
        // options.updateData = mergeObject(options.updateData ?? {}, { actorIds: actorIds });

        return super._onSubmit(event, options);
    }

    override async getData(): Promise<PopupData> {
        const sheetData: PopupData = await super.getData();

        const thisActor = this.object;
        if (!(thisActor instanceof CharacterPF2e)) {
            return sheetData;
        }

        sheetData.abilities = CONFIG.PF2E.abilities;
        sheetData.manual = thisActor.data.data.build.abilities.manual;

        sheetData.ancestry = thisActor.ancestry;
        sheetData.background = thisActor.background;
        sheetData.class = thisActor.class;
        sheetData.abilityScores = thisActor.data.data.abilities;
        sheetData.keyOptions = thisActor.data.data.build.abilities.keyOptions;
        sheetData.levelBoosts = [1, 5, 10, 15, 20].reduce(
            (ret, level) => ({
                ...ret,
                [level]: {
                    boosts: thisActor.data.data.build.abilities.boosts[level as 1],
                    full: thisActor.data.data.build.abilities.boosts[level as 1].length >= 4,
                    eligible: thisActor.data.data.details.level.value >= level,
                    remaining: 4 - thisActor.data.data.build.abilities.boosts[level as 1].length,
                },
            }),
            {}
        );

        if (thisActor.ancestry) {
            const ancestryBoosts: BoostFlawRow = Array.from(ABILITY_ABBREVIATIONS).reduce(
                (accumulated, abbrev) => ({
                    ...accumulated,
                    [abbrev]: "unavailable",
                }),
                {} as BoostFlawRow
            );

            for (const boost of Object.values(thisActor.ancestry.data.data.flaws)) {
                // deal with locked ones first
                if (boost.value.length === 1 && boost.selected) {
                    ancestryBoosts[boost.selected] = "flawed-locked";
                } else if (boost.selected) {
                    ancestryBoosts[boost.selected] = "boosted";
                }
            }

            let shownBoost = false;
            let boostsRemaining = 0;
            for (const boost of Object.values(thisActor.ancestry.data.data.boosts)) {
                if (boost.selected) {
                    if (ancestryBoosts[boost.selected] === "flawed-locked") {
                        ancestryBoosts[boost.selected] = "neutral";
                    } else if (boost.value.length === 1) {
                        ancestryBoosts[boost.selected] = "locked";
                    } else {
                        ancestryBoosts[boost.selected] = "boosted";
                    }
                } else if (boost.value.length > 0) {
                    boostsRemaining += 1;
                    if (!shownBoost) {
                        for (const ability of boost.value) {
                            switch (ancestryBoosts[ability]) {
                                case "unavailable":
                                    ancestryBoosts[ability] = "available";
                                    break;
                                case "flawed-locked":
                                    ancestryBoosts[ability] = "flawed";
                                    break;
                            }
                        }
                        shownBoost = true;
                    }
                }
            }

            sheetData.ancestryBoosts = { boosts: ancestryBoosts, remaining: boostsRemaining };
        }

        sheetData.backgroundBoosts = this.calculateBackgroundBoosts(thisActor);

        return sheetData;
    }

    private calculateBackgroundBoosts(thisActor: CharacterPF2e) {
        const backgroundBoosts: BoostFlawRow = Array.from(ABILITY_ABBREVIATIONS).reduce(
            (accumulated, abbrev) => ({
                ...accumulated,
                [abbrev]: "unavailable",
            }),
            {} as BoostFlawRow
        );
        let boostsRemaining = 0;

        if (!thisActor.background) {
            return undefined;
        }

        let shownBoost = false;
        for (const boost of Object.values(thisActor.background.data.data.boosts)) {
            if (boost.selected) {
                if (boost.value.length === 1) {
                    backgroundBoosts[boost.selected] = "locked";
                } else {
                    backgroundBoosts[boost.selected] = "boosted";
                }
            } else if (boost.value.length > 0) {
                boostsRemaining += 1;
                if (!shownBoost) {
                    for (const ability of boost.value) {
                        switch (backgroundBoosts[ability]) {
                            case "unavailable":
                                backgroundBoosts[ability] = "available";
                                break;
                            case "flawed-locked":
                                backgroundBoosts[ability] = "flawed";
                                break;
                        }
                    }
                    shownBoost = true;
                }
            }
        }

        return { boosts: backgroundBoosts, remaining: boostsRemaining };
    }
}
