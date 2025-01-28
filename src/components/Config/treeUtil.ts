import { AppCommand } from "@/types/app";

type Tree = AppCommand[];

export type DropType = "inner" | "after" | "before";

/**
 * [メイン関数] ツリー上で dragId のノードを取り除き、新しい位置へ再挿入する。
 *
 * @param tree   ツリー（複数の AppCommand が並んだ配列）
 * @param dragId 移動したいノードのID
 * @param dropTo ドロップ先のノード
 * @param type   "inner" | "after" | "before"
 *   - "inner": dropTo の子供として追加
 *   - "after" : dropTo と同じ階層で、dropTo の直後に挿入
 *   - "before" : dropTo と同じ階層で、dropTo の直前に挿入
 */
export function reorderTree(
  tree: Tree,
  dragId: string,
  dropToId: string,
  type: DropType
): Tree {
  // 1. dragId を持つノードをツリーから取り除いて"captured"（抜き取ったノード）を得る
  const { newTree: afterRemove, captured } = removeAndCapture(tree, dragId);
  if (!captured) {
    // dragId が見つからなかった → そのまま返す
    return afterRemove;
  }

  // 2. ドロップ先の "dropTo" に "captured" を挿入
  const resultTree = insertToTree(afterRemove, dropToId, captured, type);

  return resultTree;
}

/**
 * 指定した id のノードをツリーから"まるごと"抜き取り、そのノードを返す。
 * - 見つからなければ captured は undefined
 */
export function removeAndCapture(
  tree: Tree,
  targetId: string
): { newTree: Tree; captured?: AppCommand } {
  const newTree: Tree = [];
  let captured: AppCommand | undefined;

  for (const node of tree) {
    if (node.id === targetId) {
      // このノードを取り除いて、キャプチャする
      captured = node; // childrenごと丸ごと確保
      // ただし newTree には追加しない（=削除）
    } else {
      if (node.children) {
        const { newTree: updatedChildren, captured: childCaptured } =
          removeAndCapture(node.children, targetId);
        if (childCaptured) {
          captured = childCaptured;
        }
        node.children =
          updatedChildren.length > 0 ? updatedChildren : undefined;
      }
      newTree.push(node);
    }
  }

  return { newTree, captured };
}

/**
 * 指定した parentId ノードを探し、そこに child を挿入する。
 * - type === "inner" → parentId の children に加える
 * - type === "after" or "before" → parentId と同じ階層で、その直後/直前に挿入
 *
 * 親が見つからなかった場合、何もせずツリーをそのまま返す設計。
 * （要件次第で「なければトップレベルに追加」などにしてもOK）
 */
function insertToTree(
  tree: Tree,
  parentId: string,
  child: AppCommand,
  type: DropType
): Tree {
  const { newTree } = insertRecursive(tree, parentId, child, type);
  return newTree;
}

function insertRecursive(
  tree: Tree,
  parentId: string,
  child: AppCommand,
  type: DropType
): { newTree: Tree; inserted: boolean } {
  const newTree: Tree = [];
  let inserted = false;

  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];

    if (node.id === parentId) {
      inserted = true;
      if (type === "inner") {
        node.children = node.children ? [...node.children, child] : [child];
        newTree.push(node);
      } else if (type === "after") {
        // 先に parentId のノードを push
        newTree.push(node);
        // その直後に child を挿入
        newTree.push(child);
      } else if (type === "before") {
        // parentId の直前に child を挿入
        newTree.push(child);
        newTree.push(node);
      }
    } else {
      // 子に再帰
      if (node.children) {
        const { newTree: updatedChildren, inserted: childInserted } =
          insertRecursive(node.children, parentId, child, type);
        if (childInserted) {
          inserted = true;
        }
        node.children =
          updatedChildren.length > 0 ? updatedChildren : undefined;
      }
      newTree.push(node);
    }
  }

  return { newTree, inserted };
}

export function changeName(tree: Tree, id: string, newName: string): Tree {
  return tree.map((node) => {
    if (node.id === id) {
      return { ...node, name: newName };
    }
    if (node.children) {
      return { ...node, children: changeName(node.children, id, newName) };
    }
    return node;
  });
}

export function findNodeById(tree: Tree, id: string): AppCommand | undefined {
  for (const node of tree) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

export function findNodeDepthById(
  tree: Tree,
  id?: string
): AppCommand[] | undefined {
  if (!id) {
    return tree;
  }

  for (const node of tree) {
    if (node.id === id) {
      return tree;
    }

    if (node.children) {
      return findNodeDepthById(node.children, id);
    }
  }

  return undefined;
}
