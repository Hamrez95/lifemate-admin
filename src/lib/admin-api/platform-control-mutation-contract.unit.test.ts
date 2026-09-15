import { describe, expect, it } from "vitest";

import { parsePlatformControlMutationSuccess } from "./platform-control-mutation-contract";

const ruleId = "123e4567-e89b-42d3-a456-426614174000";

describe("platform control mutation success contract", () => {
  it("accepts canonical control create and update success", () => {
    expect(
      parsePlatformControlMutationSuccess(
        {
          item: {
            control_key: "living_camp.enabled",
            control_kind: "FeatureFlag",
            value_type: "Boolean",
            status: "Active",
            version: 1,
          },
          replayed: false,
        },
        201,
        {
          kind: "control-create",
          controlKey: "living_camp.enabled",
          controlKind: "FeatureFlag",
          valueType: "Boolean",
        },
      ),
    ).toEqual({ replayed: false });

    expect(
      parsePlatformControlMutationSuccess(
        {
          item: {
            control_key: "living_camp.enabled",
            description: "Global Living Camp rollout",
            fail_closed: true,
            status: "Active",
            version: 4,
          },
          replayed: true,
        },
        200,
        {
          kind: "control-update",
          controlKey: "living_camp.enabled",
          expectedVersion: 3,
          status: "Active",
          description: "Global Living Camp rollout",
          failClosed: true,
        },
      ),
    ).toEqual({ replayed: true });
  });

  it("accepts canonical rule create and update success", () => {
    expect(
      parsePlatformControlMutationSuccess(
        {
          item: {
            id: ruleId,
            control_key: "living_camp.enabled",
            priority: 20,
            target_type: "Beta",
            status: "Active",
            version: 1,
          },
          replayed: false,
        },
        201,
        {
          kind: "rule-create",
          controlKey: "living_camp.enabled",
          priority: 20,
          targetType: "Beta",
          status: "Active",
        },
      ),
    ).toEqual({ replayed: false });

    expect(
      parsePlatformControlMutationSuccess(
        {
          item: {
            id: ruleId,
            priority: 10,
            target_type: "Product",
            status: "Disabled",
            version: 5,
          },
          replayed: true,
        },
        200,
        {
          kind: "rule-update",
          ruleId,
          expectedVersion: 4,
          priority: 10,
          targetType: "Product",
          status: "Disabled",
        },
      ),
    ).toEqual({ replayed: true });
  });

  it("accepts canonical rollback and kill-switch success", () => {
    expect(
      parsePlatformControlMutationSuccess(
        {
          item: { control_key: "living_camp.enabled", version: 8 },
          replayed: false,
        },
        200,
        { kind: "rollback", controlKey: "living_camp.enabled", expectedVersion: 7 },
      ),
    ).toEqual({ replayed: false });

    expect(
      parsePlatformControlMutationSuccess(
        {
          item: {
            control_key: "living_camp.enabled",
            default_value: false,
            fail_closed: true,
            version: 9,
          },
          replayed: true,
        },
        200,
        { kind: "kill-switch", controlKey: "living_camp.enabled", expectedVersion: 8 },
      ),
    ).toEqual({ replayed: true });
  });

  it.each([
    [
      { item: { control_key: "wrong.key", version: 8 }, replayed: false },
      200,
      { kind: "rollback", controlKey: "living_camp.enabled", expectedVersion: 7 } as const,
    ],
    [
      { item: { control_key: "living_camp.enabled", version: 7 }, replayed: false },
      200,
      { kind: "rollback", controlKey: "living_camp.enabled", expectedVersion: 7 } as const,
    ],
    [
      {
        item: {
          control_key: "living_camp.enabled",
          default_value: true,
          fail_closed: true,
          version: 9,
        },
        replayed: false,
      },
      200,
      { kind: "kill-switch", controlKey: "living_camp.enabled", expectedVersion: 8 } as const,
    ],
    [
      {
        item: {
          id: "123e4567-e89b-42d3-a456-426614174001",
          priority: 10,
          target_type: "Product",
          status: "Disabled",
          version: 5,
        },
        replayed: false,
      },
      200,
      {
        kind: "rule-update",
        ruleId,
        expectedVersion: 4,
        priority: 10,
        targetType: "Product",
        status: "Disabled",
      } as const,
    ],
    [
      {
        item: {
          control_key: "living_camp.enabled",
          control_kind: "FeatureFlag",
          value_type: "Boolean",
          status: "Active",
          version: 1,
        },
        replayed: "false",
      },
      201,
      {
        kind: "control-create",
        controlKey: "living_camp.enabled",
        controlKind: "FeatureFlag",
        valueType: "Boolean",
      } as const,
    ],
  ])("rejects malformed or misbound platform success %#", (value, status, expectation) => {
    expect(parsePlatformControlMutationSuccess(value, status, expectation)).toBeNull();
  });
});
