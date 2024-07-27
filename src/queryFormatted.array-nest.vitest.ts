import { describe, it, expect, vi } from "vitest";
import { queryFormatted } from "./queryFormatted";
import { Tool } from "./tools";
import * as t from "io-ts";
import {
  UnexpectedResponseError,
  AINotFollowingInstructionsError,
} from "./errors";

describe("queryFormatted with root array and nested structures", () => {
  const complexArrayRootTool: Tool<
    Array<{ title: string; details: { url: string; tags: string[] } }>
  > = {
    name: "complexArrayRootTool",
    description: "A tool that expects an array of complex objects",
    parameters: t.array(
      t.type({
        title: t.string,
        details: t.type({
          url: t.string,
          tags: t.array(t.string),
        }),
      })
    ),
  };

  const createMockOpenAI = (toolCalls: any) => ({
    chat: {
      completions: {
        create: vi
          .fn()
          .mockResolvedValue({
            choices: [{ message: { tool_calls: toolCalls } }],
          }),
      },
    },
  });

  it("should correctly parse a root array with nested structures", async () => {
    const mockOpenAI = createMockOpenAI([
      {
        id: "call_complex",
        type: "function",
        function: {
          name: "complexArrayRootTool",
          arguments: JSON.stringify({
            items: JSON.stringify([
              {
                title: "ニュース1",
                details: {
                  url: "https://example.com/1",
                  tags: ["政治", "経済"],
                },
              },
              {
                title: "ニュース2",
                details: {
                  url: "https://example.com/2",
                  tags: ["スポーツ", "健康"],
                },
              },
            ]),
          }),
        },
      },
    ]);

    const result = await queryFormatted(
      mockOpenAI as any,
      "test-model",
      "テストプロンプト",
      complexArrayRootTool
    );

    expect(result).toEqual({
      tool: complexArrayRootTool,
      parameters: [
        {
          title: "ニュース1",
          details: {
            url: "https://example.com/1",
            tags: ["政治", "経済"],
          },
        },
        {
          title: "ニュース2",
          details: {
            url: "https://example.com/2",
            tags: ["スポーツ", "健康"],
          },
        },
      ],
    });
  });

  it("should handle a stringified JSON array with nested structures", async () => {
    const mockOpenAI = createMockOpenAI([
      {
        id: "call_stringified",
        type: "function",
        function: {
          name: "complexArrayRootTool",
          arguments: JSON.stringify({
            items: JSON.stringify([
              {
                title: "ニュース3",
                details: {
                  url: "https://example.com/3",
                  tags: ["技術", "イノベーション"],
                },
              },
            ]),
          }),
        },
      },
    ]);

    const result = await queryFormatted(
      mockOpenAI as any,
      "test-model",
      "テストプロンプト",
      complexArrayRootTool
    );

    expect(result).toEqual({
      tool: complexArrayRootTool,
      parameters: [
        {
          title: "ニュース3",
          details: {
            url: "https://example.com/3",
            tags: ["技術", "イノベーション"],
          },
        },
      ],
    });
  });

  it("should handle JSON5 format input with root array and nested structures", async () => {
    const mockOpenAI = createMockOpenAI([
      {
        id: "call_json5",
        type: "function",
        function: {
          name: "complexArrayRootTool",
          arguments: `{
          items: '[{"title":"ニュース4","details":{"url":"https://example.com/4","tags":["環境","社会"]}},{"title":"ニュース5","details":{"url":"https://example.com/5","tags":["文化","芸術"]}}]'
        }`,
        },
      },
    ]);

    const result = await queryFormatted(
      mockOpenAI as any,
      "test-model",
      "テストプロンプト",
      complexArrayRootTool
    );

    expect(result).toEqual({
      tool: complexArrayRootTool,
      parameters: [
        {
          title: "ニュース4",
          details: {
            url: "https://example.com/4",
            tags: ["環境", "社会"],
          },
        },
        {
          title: "ニュース5",
          details: {
            url: "https://example.com/5",
            tags: ["文化", "芸術"],
          },
        },
      ],
    });
  });
  it("should throw UnexpectedResponseError when invalid structure is returned", async () => {
    const mockOpenAI = createMockOpenAI([
      {
        id: "call_invalid",
        type: "function",
        function: {
          name: "complexArrayRootTool",
          arguments: JSON.stringify({
            items: '{"notAnArray": "This is not an array"}',
          }),
        },
      },
    ]);

    await expect(
      queryFormatted(
        mockOpenAI as any,
        "test-model",
        "テストプロンプト",
        complexArrayRootTool
      )
    ).rejects.toThrow(UnexpectedResponseError);
  });

  it("should throw AINotFollowingInstructionsError when wrong tool is called", async () => {
    const mockOpenAI = createMockOpenAI([
      {
        id: "call_wrong_tool",
        type: "function",
        function: {
          name: "wrongTool",
          arguments: '{"items": "[]"}',
        },
      },
    ]);

    await expect(
      queryFormatted(
        mockOpenAI as any,
        "test-model",
        "テストプロンプト",
        complexArrayRootTool
      )
    ).rejects.toThrow(AINotFollowingInstructionsError);
  });
});
