import { ActorPF2e } from "@actor";
import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { ScenePF2e } from "@module/scene";

/**
 * This is the base class for a migration.
 * If you make a change to the database schema (i.e. anything in template.json or `src/module/.../types.ts`),
 * you should create a migration. To do so, there are several steps:
 * - Bump the schema number in MigrationRunnerBase.LATEST_SCHEMA_VERSION
 * - Make a class that inherits this base class and implements `updateActor` or `updateItem` using the
 *   new value of the schema number as the version
 * - Add to the index in `src/module/migration/migrations/index.ts`
 * - Add to the migrations array in `packs/scripts/run-migration.ts`
 * - Test your changes work in a world, and make sure the unit tests in `tests/module/migration.test.ts` run.
 */
abstract class MigrationBase {
    /**
     * This is the schema version, not the system version.
     */
    static readonly version: number;

    readonly version = (this.constructor as typeof MigrationBase).version;

    /**
     * Setting requiresFlush to true will indicate that the migration runner should not call any more
     * migrations after this in a batch. Use this if you are adding items to actors for instance.
     */
    requiresFlush = false;
}

/** Optional methods */
interface MigrationBase {
    /**
     * Update the actor to the latest schema version.
     * @param source This should be effectively a `ActorSourcePF2e` from the previous version.
     */
    updateActor?(source: ActorSourcePF2e): Promise<void>;

    /**
     * Update the item to the latest schema version, handling changes that must happen before any other migration in a
     * given list.
     * @param source Item to update. This should be an `ItemData` from the previous version
     * @param actorSource If the item is part of an actor, this is set to the actor source
     */
    preUpdateItem?(source: ItemSourcePF2e, actorSource?: ActorSourcePF2e): Promise<void>;

    /**
     * Update the item to the latest schema version.
     * @param source Item to update. This should be an `ItemData` from the previous version.
     * @param actorSource If the item is part of an actor, this is set to the actor. For instance
     */
    updateItem?(source: ItemSourcePF2e, actorSource?: ActorSourcePF2e): Promise<void>;

    /**
     * Update the macro to the latest schema version.
     * @param source Macro data to update. This should be a `MacroData` from the previous version.
     */
    updateJournalEntry?(source: foundry.data.JournalEntrySource): Promise<void>;

    /**
     * Update the macro to the latest schema version.
     * @param source Macro data to update. This should be a `MacroData` from the previous version.
     */
    updateMacro?(source: foundry.data.MacroSource): Promise<void>;

    /**
     * Update the rollable table to the latest schema version.
     * @param source Rolltable data to update. This should be a `RollTableData` from the previous version.
     */
    updateTable?(source: foundry.data.RollTableSource): Promise<void>;

    /**
     * Update the token to the latest schema version.
     * @param tokenData Token data to update. This should be a `TokenData` from the previous version.
     */
    updateToken?(
        tokenData: foundry.data.TokenSource,
        actor: Readonly<ActorPF2e | null>,
        scene: Readonly<ScenePF2e | null>
    ): Promise<void>;

    /**
     * Update the user to the latest schema version.
     * @param userData User's data to update. This should be a `UserData` from the previous version.
     */
    updateUser?(userData: foundry.data.UserSource): Promise<void>;

    /**
     * Run migrations for this schema version.
     * Sometimes there needs to be custom steps run during a migration. For instance, if the change
     * isn't actor or item related. This function will be called during the migration.
     */
    migrate?(): Promise<void>;
}

export { MigrationBase };
