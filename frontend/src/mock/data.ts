// TODO: Remove this file when connecting to real API — replace all imports with real API calls.

// ── Local types (not exported — structural typing handles compatibility) ────────

type Difficulty = 'Easy' | 'Medium' | 'Hard';

type Category =
  | 'Arrays' | 'Strings' | 'Dynamic Programming' | 'Trees'
  | 'Graphs' | 'Math' | 'Hash Maps' | 'Sorting' | 'Binary Search'
  | 'Linked Lists' | 'Stack & Queue';

interface StarterCode {
  javascript: string;
  python:     string;
  cpp:        string;
  java:       string;
}

interface TestCase {
  id:     string;
  input:  string;
  output: string;
}

interface Example {
  input:        string;
  output:       string;
  explanation?: string;
}

// ── Exported types ─────────────────────────────────────────────────────────────

export interface MockChallenge {
  id:           string;
  title:        string;
  description:  string;
  difficulty:   Difficulty;
  category:     Category;
  inputFormat:  string;
  outputFormat: string;
  constraints:  string[];
  examples:     Example[];
  starterCode:  StarterCode;
  testCases:    TestCase[];
}

export interface MockSubmission {
  id:       string;
  date:     string;
  language: string;
  status:   'Accepted' | 'Wrong Answer' | 'TLE';
  runtime:  string;
}

// ── mockChallenges ─────────────────────────────────────────────────────────────
// Used by: Challenges.tsx, ChallengeDetail.tsx, ManageChallenges.tsx

export const mockChallenges: MockChallenge[] = [
  {
    id:          'c-001',
    title:       'Two Sum',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order.',
    difficulty:  'Easy',
    category:    'Arrays',
    inputFormat:  'An integer array `nums` followed by an integer `target`.',
    outputFormat: 'An array of two integers `[i, j]` such that `nums[i] + nums[j] === target`.',
    constraints: [
      '2 ≤ nums.length ≤ 10⁴',
      '-10⁹ ≤ nums[i] ≤ 10⁹',
      '-10⁹ ≤ target ≤ 10⁹',
      'Only one valid answer exists.',
    ],
    examples: [
      { input: 'nums = [2, 7, 11, 15]\ntarget = 9', output: '[0, 1]', explanation: 'nums[0] + nums[1] = 2 + 7 = 9, so we return [0, 1].' },
      { input: 'nums = [3, 2, 4]\ntarget = 6',      output: '[1, 2]', explanation: 'nums[1] + nums[2] = 2 + 4 = 6.' },
      { input: 'nums = [3, 3]\ntarget = 6',         output: '[0, 1]' },
    ],
    starterCode: {
      javascript: `function twoSum(nums, target) {\n  // Your solution here\n}\n\nconsole.log(twoSum([2, 7, 11, 15], 9));`,
      python:     `def two_sum(nums, target):\n    # Your solution here\n    pass\n\nprint(two_sum([2, 7, 11, 15], 9))`,
      cpp:        `#include <iostream>\n#include <vector>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Your solution here\n    return {};\n}\n\nint main() {\n    vector<int> nums = {2, 7, 11, 15};\n    auto r = twoSum(nums, 9);\n    cout << r[0] << "," << r[1] << endl;\n}`,
      java:       `import java.util.*;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your solution here\n        return new int[]{};\n    }\n}`,
    },
    testCases: [
      { id: 'tc-001-1', input: '[2,7,11,15], 9', output: '[0,1]' },
      { id: 'tc-001-2', input: '[3,2,4], 6',     output: '[1,2]' },
      { id: 'tc-001-3', input: '[3,3], 6',        output: '[0,1]' },
    ],
  },

  {
    id:          'c-002',
    title:       'Longest Substring Without Repeating Characters',
    description: 'Given a string `s`, find the length of the **longest substring** without repeating characters.\n\nA **substring** is a contiguous non-empty sequence of characters within a string.',
    difficulty:  'Medium',
    category:    'Strings',
    inputFormat:  'A single string `s`.',
    outputFormat: 'An integer representing the length of the longest substring without repeating characters.',
    constraints: [
      '0 ≤ s.length ≤ 5 × 10⁴',
      's consists of English letters, digits, symbols and spaces.',
    ],
    examples: [
      { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with length 3.' },
      { input: 's = "bbbbb"',   output: '1', explanation: 'The answer is "b", with length 1.' },
      { input: 's = "pwwkew"', output: '3', explanation: 'The answer is "wke", with length 3. Note that the answer must be a substring — "pwke" is a subsequence, not a substring.' },
    ],
    starterCode: {
      javascript: `function lengthOfLongestSubstring(s) {\n  // Your solution here\n}\n\nconsole.log(lengthOfLongestSubstring("abcabcbb"));`,
      python:     `def length_of_longest_substring(s):\n    # Your solution here\n    pass\n\nprint(length_of_longest_substring("abcabcbb"))`,
      cpp:        `#include <iostream>\n#include <string>\nusing namespace std;\n\nint lengthOfLongestSubstring(string s) {\n    // Your solution here\n    return 0;\n}\n\nint main() {\n    cout << lengthOfLongestSubstring("abcabcbb") << endl;\n}`,
      java:       `class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Your solution here\n        return 0;\n    }\n}`,
    },
    testCases: [
      { id: 'tc-002-1', input: '"abcabcbb"', output: '3' },
      { id: 'tc-002-2', input: '"bbbbb"',    output: '1' },
      { id: 'tc-002-3', input: '"pwwkew"',   output: '3' },
    ],
  },

  {
    id:          'c-003',
    title:       'Climbing Stairs',
    description: 'You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb **1** or **2** steps. In how many distinct ways can you climb to the top?',
    difficulty:  'Easy',
    category:    'Dynamic Programming',
    inputFormat:  'An integer `n` representing the number of stairs.',
    outputFormat: 'An integer representing the number of distinct ways to climb to the top.',
    constraints: ['1 ≤ n ≤ 45'],
    examples: [
      { input: 'n = 2', output: '2', explanation: 'Two ways: (1 step + 1 step) or (2 steps).' },
      { input: 'n = 3', output: '3', explanation: 'Three ways: (1+1+1), (1+2), or (2+1).' },
    ],
    starterCode: {
      javascript: `function climbStairs(n) {\n  // Your solution here\n}\n\nconsole.log(climbStairs(5));`,
      python:     `def climb_stairs(n):\n    # Your solution here\n    pass\n\nprint(climb_stairs(5))`,
      cpp:        `#include <iostream>\nusing namespace std;\n\nint climbStairs(int n) {\n    // Your solution here\n    return 0;\n}\n\nint main() {\n    cout << climbStairs(5) << endl;\n}`,
      java:       `class Solution {\n    public int climbStairs(int n) {\n        // Your solution here\n        return 0;\n    }\n}`,
    },
    testCases: [
      { id: 'tc-003-1', input: '2', output: '2' },
      { id: 'tc-003-2', input: '3', output: '3' },
      { id: 'tc-003-3', input: '5', output: '8' },
    ],
  },

  {
    id:          'c-004',
    title:       'Binary Tree Level Order Traversal',
    description: 'Given the `root` of a binary tree, return the **level order traversal** of its nodes\' values (i.e., from left to right, level by level).',
    difficulty:  'Medium',
    category:    'Trees',
    inputFormat:  'The root of a binary tree.',
    outputFormat: 'A 2D array where each inner array contains node values at that level.',
    constraints: [
      '0 ≤ number of nodes ≤ 2000',
      '-1000 ≤ Node.val ≤ 1000',
    ],
    examples: [
      { input: 'root = [3,9,20,null,null,15,7]', output: '[[3],[9,20],[15,7]]', explanation: 'Level 1: [3], Level 2: [9, 20], Level 3: [15, 7].' },
      { input: 'root = [1]',                      output: '[[1]]' },
      { input: 'root = []',                        output: '[]' },
    ],
    starterCode: {
      javascript: `function levelOrder(root) {\n  // Your solution here\n}\n`,
      python:     `def level_order(root):\n    # Your solution here\n    pass\n`,
      cpp:        `#include <iostream>\n#include <vector>\n#include <queue>\nusing namespace std;\n\nstruct TreeNode { int val; TreeNode *left, *right; };\n\nvector<vector<int>> levelOrder(TreeNode* root) {\n    // Your solution here\n    return {};\n}\n`,
      java:       `import java.util.*;\n\nclass Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        // Your solution here\n        return new ArrayList<>();\n    }\n}\n`,
    },
    testCases: [
      { id: 'tc-004-1', input: '[3,9,20,null,null,15,7]', output: '[[3],[9,20],[15,7]]' },
      { id: 'tc-004-2', input: '[1]',                      output: '[[1]]' },
    ],
  },

  {
    id:          'c-005',
    title:       'Merge K Sorted Lists',
    description: 'You are given an array of `k` linked lists, each sorted in ascending order.\n\nMerge all the linked lists into **one sorted linked list** and return it.',
    difficulty:  'Hard',
    category:    'Arrays',
    inputFormat:  'An array of `k` linked list heads.',
    outputFormat: 'The head of the merged sorted linked list.',
    constraints: [
      'k == lists.length',
      '0 ≤ k ≤ 10⁴',
      '0 ≤ lists[i].length ≤ 500',
      '-10⁴ ≤ lists[i][j] ≤ 10⁴',
      'lists[i] is sorted in ascending order.',
    ],
    examples: [
      { input: 'lists = [[1,4,5],[1,3,4],[2,6]]', output: '[1,1,2,3,4,4,5,6]', explanation: 'Merge the three sorted lists.' },
      { input: 'lists = []',                       output: '[]' },
    ],
    starterCode: {
      javascript: `function mergeKLists(lists) {\n  // Your solution here\n}\n`,
      python:     `def merge_k_lists(lists):\n    # Your solution here\n    pass\n`,
      cpp:        `#include <iostream>\n#include <vector>\nusing namespace std;\n\nstruct ListNode { int val; ListNode *next; };\n\nListNode* mergeKLists(vector<ListNode*>& lists) {\n    // Your solution here\n    return nullptr;\n}\n`,
      java:       `import java.util.*;\n\nclass Solution {\n    public ListNode mergeKLists(ListNode[] lists) {\n        // Your solution here\n        return null;\n    }\n}\n`,
    },
    testCases: [
      { id: 'tc-005-1', input: '[[1,4,5],[1,3,4],[2,6]]', output: '[1,1,2,3,4,4,5,6]' },
      { id: 'tc-005-2', input: '[]',                       output: '[]' },
    ],
  },

  {
    id:          'c-006',
    title:       'Number of Islands',
    description: 'Given an `m x n` 2D binary grid where `"1"` represents land and `"0"` represents water, return the **number of islands**.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.',
    difficulty:  'Medium',
    category:    'Graphs',
    inputFormat:  'A 2D character grid `grid` of size `m × n`.',
    outputFormat: 'An integer — the number of islands in the grid.',
    constraints: [
      'm == grid.length',
      'n == grid[i].length',
      '1 ≤ m, n ≤ 300',
      'grid[i][j] is either "0" or "1".',
    ],
    examples: [
      {
        input: `grid = [\n  ["1","1","1","1","0"],\n  ["1","1","0","1","0"],\n  ["1","1","0","0","0"],\n  ["0","0","0","0","0"]\n]`,
        output: '1',
        explanation: 'The entire landmass is connected — one island.',
      },
      {
        input: `grid = [\n  ["1","1","0","0","0"],\n  ["1","1","0","0","0"],\n  ["0","0","1","0","0"],\n  ["0","0","0","1","1"]\n]`,
        output: '3',
        explanation: 'Three separate islands.',
      },
    ],
    starterCode: {
      javascript: `function numIslands(grid) {\n  // Your solution here\n}\n`,
      python:     `def num_islands(grid):\n    # Your solution here\n    pass\n`,
      cpp:        `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint numIslands(vector<vector<char>>& grid) {\n    // Your solution here\n    return 0;\n}\n`,
      java:       `class Solution {\n    public int numIslands(char[][] grid) {\n        // Your solution here\n        return 0;\n    }\n}\n`,
    },
    testCases: [
      { id: 'tc-006-1', input: '[["1","1","0"],["0","1","0"],["0","0","1"]]', output: '2' },
      { id: 'tc-006-2', input: '[["1","1","1"],["1","1","1"],["1","1","1"]]', output: '1' },
    ],
  },

  {
    id:          'c-007',
    title:       'Coin Change',
    description: 'You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the **fewest number of coins** needed to make up that amount. If the amount cannot be made up by any combination of coins, return `-1`.',
    difficulty:  'Medium',
    category:    'Dynamic Programming',
    inputFormat:  'An integer array `coins` and an integer `amount`.',
    outputFormat: 'An integer — the minimum number of coins, or `-1` if the amount is unreachable.',
    constraints: [
      '1 ≤ coins.length ≤ 12',
      '1 ≤ coins[i] ≤ 2³¹ − 1',
      '0 ≤ amount ≤ 10⁴',
    ],
    examples: [
      { input: 'coins = [1, 2, 5]\namount = 11', output: '3', explanation: '11 = 5 + 5 + 1.' },
      { input: 'coins = [2]\namount = 3',        output: '-1' },
      { input: 'coins = [1]\namount = 0',        output: '0' },
    ],
    starterCode: {
      javascript: `function coinChange(coins, amount) {\n  // Your solution here\n}\n\nconsole.log(coinChange([1, 2, 5], 11));`,
      python:     `def coin_change(coins, amount):\n    # Your solution here\n    pass\n\nprint(coin_change([1, 2, 5], 11))`,
      cpp:        `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint coinChange(vector<int>& coins, int amount) {\n    // Your solution here\n    return -1;\n}\n\nint main() {\n    vector<int> c = {1, 2, 5};\n    cout << coinChange(c, 11) << endl;\n}`,
      java:       `class Solution {\n    public int coinChange(int[] coins, int amount) {\n        // Your solution here\n        return -1;\n    }\n}\n`,
    },
    testCases: [
      { id: 'tc-007-1', input: '[1,2,5], 11', output: '3' },
      { id: 'tc-007-2', input: '[2], 3',       output: '-1' },
      { id: 'tc-007-3', input: '[1], 0',        output: '0' },
    ],
  },

  {
    id:          'c-008',
    title:       'Valid Anagram',
    description: 'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\nAn **anagram** is a word or phrase formed by rearranging the letters of another, using all original letters exactly once.',
    difficulty:  'Easy',
    category:    'Strings',
    inputFormat:  'Two strings `s` and `t`.',
    outputFormat: '`true` if `t` is an anagram of `s`, otherwise `false`.',
    constraints: [
      '1 ≤ s.length, t.length ≤ 5 × 10⁴',
      's and t consist of lowercase English letters.',
    ],
    examples: [
      { input: 's = "anagram"\nt = "nagaram"', output: 'true' },
      { input: 's = "rat"\nt = "car"',       output: 'false' },
    ],
    starterCode: {
      javascript: `function isAnagram(s, t) {\n  // Your solution here\n}\n\nconsole.log(isAnagram("anagram", "nagaram"));`,
      python:     `def is_anagram(s, t):\n    # Your solution here\n    pass\n\nprint(is_anagram("anagram", "nagaram"))`,
      cpp:        `#include <iostream>\n#include <string>\nusing namespace std;\n\nbool isAnagram(string s, string t) {\n    // Your solution here\n    return false;\n}\n\nint main() {\n    cout << isAnagram("anagram", "nagaram") << endl;\n}`,
      java:       `class Solution {\n    public boolean isAnagram(String s, String t) {\n        // Your solution here\n        return false;\n    }\n}\n`,
    },
    testCases: [
      { id: 'tc-008-1', input: '"anagram", "nagaram"', output: 'true' },
      { id: 'tc-008-2', input: '"rat", "car"',          output: 'false' },
    ],
  },

  {
    id:          'c-009',
    title:       'Word Ladder',
    description: 'A **transformation sequence** from word `beginWord` to word `endWord` using a dictionary `wordList` is a sequence `beginWord → s₁ → s₂ → … → sₖ` such that:\n- Every adjacent pair of words differs by a single letter.\n- Every `sᵢ` exists in `wordList`.\n\nReturn the **number of words** in the shortest transformation sequence, or `0` if no such sequence exists.',
    difficulty:  'Hard',
    category:    'Graphs',
    inputFormat:  'Strings `beginWord` and `endWord`, and an array `wordList`.',
    outputFormat: 'The length of the shortest transformation sequence, or `0` if none exists.',
    constraints: [
      '1 ≤ beginWord.length ≤ 10',
      'endWord.length == beginWord.length',
      '1 ≤ wordList.length ≤ 5000',
      'wordList[i].length == beginWord.length',
      'All words consist of lowercase English letters.',
    ],
    examples: [
      { input: 'beginWord = "hit"\nendWord = "cog"\nwordList = ["hot","dot","dog","lot","log","cog"]', output: '5', explanation: '"hit" → "hot" → "dot" → "dog" → "cog"' },
      { input: 'beginWord = "hit"\nendWord = "cog"\nwordList = ["hot","dot","dog","lot","log"]',        output: '0', explanation: '"cog" is not in wordList.' },
    ],
    starterCode: {
      javascript: `function ladderLength(beginWord, endWord, wordList) {\n  // Your solution here\n}\n`,
      python:     `def ladder_length(begin_word, end_word, word_list):\n    # Your solution here\n    pass\n`,
      cpp:        `#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nint ladderLength(string beginWord, string endWord, vector<string>& wordList) {\n    // Your solution here\n    return 0;\n}\n`,
      java:       `import java.util.*;\n\nclass Solution {\n    public int ladderLength(String beginWord, String endWord, List<String> wordList) {\n        // Your solution here\n        return 0;\n    }\n}\n`,
    },
    testCases: [
      { id: 'tc-009-1', input: '"hit", "cog", ["hot","dot","dog","lot","log","cog"]', output: '5' },
      { id: 'tc-009-2', input: '"hit", "cog", ["hot","dot","dog","lot","log"]',       output: '0' },
    ],
  },

  {
    id:          'c-010',
    title:       'Power of Two',
    description: 'Given an integer `n`, return `true` if it is a power of two. Otherwise, return `false`.\n\nAn integer `n` is a **power of two** if there exists an integer `x` such that `n == 2ˣ`.\n\nSolve this using **bit manipulation**.',
    difficulty:  'Easy',
    category:    'Math',
    inputFormat:  'A single integer `n`.',
    outputFormat: '`true` if `n` is a power of two, otherwise `false`.',
    constraints: ['-2³¹ ≤ n ≤ 2³¹ − 1'],
    examples: [
      { input: 'n = 1',  output: 'true',  explanation: '2⁰ = 1' },
      { input: 'n = 16', output: 'true',  explanation: '2⁴ = 16' },
      { input: 'n = 3',  output: 'false' },
    ],
    starterCode: {
      javascript: `function isPowerOfTwo(n) {\n  // Your solution here\n}\n\nconsole.log(isPowerOfTwo(16));`,
      python:     `def is_power_of_two(n):\n    # Your solution here\n    pass\n\nprint(is_power_of_two(16))`,
      cpp:        `#include <iostream>\nusing namespace std;\n\nbool isPowerOfTwo(int n) {\n    // Your solution here\n    return false;\n}\n\nint main() {\n    cout << isPowerOfTwo(16) << endl;\n}`,
      java:       `class Solution {\n    public boolean isPowerOfTwo(int n) {\n        // Your solution here\n        return false;\n    }\n}\n`,
    },
    testCases: [
      { id: 'tc-010-1', input: '1',  output: 'true' },
      { id: 'tc-010-2', input: '16', output: 'true' },
      { id: 'tc-010-3', input: '3',  output: 'false' },
    ],
  },

  {
    id:          'c-011',
    title:       'Edit Distance',
    description: 'Given two strings `word1` and `word2`, return the **minimum number of operations** required to convert `word1` to `word2`.\n\nAllowed operations:\n- **Insert** a character\n- **Delete** a character\n- **Replace** a character',
    difficulty:  'Hard',
    category:    'Dynamic Programming',
    inputFormat:  'Two strings `word1` and `word2`.',
    outputFormat: 'An integer — the minimum edit distance between `word1` and `word2`.',
    constraints: [
      '0 ≤ word1.length, word2.length ≤ 500',
      'word1 and word2 consist of lowercase English letters.',
    ],
    examples: [
      { input: 'word1 = "horse"\nword2 = "ros"', output: '3', explanation: 'horse → rorse (replace h→r) → rose (delete r) → ros (delete e).' },
      { input: 'word1 = "intention"\nword2 = "execution"', output: '5' },
    ],
    starterCode: {
      javascript: `function minDistance(word1, word2) {\n  // Your solution here\n}\n\nconsole.log(minDistance("horse", "ros"));`,
      python:     `def min_distance(word1, word2):\n    # Your solution here\n    pass\n\nprint(min_distance("horse", "ros"))`,
      cpp:        `#include <iostream>\n#include <string>\nusing namespace std;\n\nint minDistance(string word1, string word2) {\n    // Your solution here\n    return 0;\n}\n\nint main() {\n    cout << minDistance("horse", "ros") << endl;\n}`,
      java:       `class Solution {\n    public int minDistance(String word1, String word2) {\n        // Your solution here\n        return 0;\n    }\n}\n`,
    },
    testCases: [
      { id: 'tc-011-1', input: '"horse", "ros"',       output: '3' },
      { id: 'tc-011-2', input: '"intention", "execution"', output: '5' },
    ],
  },

  {
    id:          'c-012',
    title:       'Count Primes',
    description: 'Given an integer `n`, return the **number of prime numbers** that are strictly less than `n`.\n\nUse the **Sieve of Eratosthenes** for an efficient O(n log log n) solution.',
    difficulty:  'Medium',
    category:    'Math',
    inputFormat:  'A single integer `n`.',
    outputFormat: 'An integer — the count of primes strictly less than `n`.',
    constraints: ['0 ≤ n ≤ 5 × 10⁶'],
    examples: [
      { input: 'n = 10', output: '4', explanation: 'Primes less than 10: 2, 3, 5, 7.' },
      { input: 'n = 0',  output: '0' },
      { input: 'n = 1',  output: '0' },
    ],
    starterCode: {
      javascript: `function countPrimes(n) {\n  // Your solution here\n}\n\nconsole.log(countPrimes(10));`,
      python:     `def count_primes(n):\n    # Your solution here\n    pass\n\nprint(count_primes(10))`,
      cpp:        `#include <iostream>\nusing namespace std;\n\nint countPrimes(int n) {\n    // Your solution here\n    return 0;\n}\n\nint main() {\n    cout << countPrimes(10) << endl;\n}`,
      java:       `class Solution {\n    public int countPrimes(int n) {\n        // Your solution here\n        return 0;\n    }\n}\n`,
    },
    testCases: [
      { id: 'tc-012-1', input: '10', output: '4' },
      { id: 'tc-012-2', input: '0',  output: '0' },
    ],
  },
];

// ── mockSubmissions ────────────────────────────────────────────────────────────
// Challenge submission history keyed by challenge id.
// Used by: ChallengeDetail.tsx

export const mockSubmissions: Record<string, MockSubmission[]> = {
  'c-001': [
    { id: 's-001-1', date: '2026-02-22 14:31', language: 'Python',     status: 'Accepted',     runtime: '48 ms' },
    { id: 's-001-2', date: '2026-02-22 14:18', language: 'Python',     status: 'Wrong Answer', runtime: '—'     },
    { id: 's-001-3', date: '2026-02-20 09:05', language: 'JavaScript', status: 'TLE',          runtime: '—'     },
  ],
  'c-002': [
    { id: 's-002-1', date: '2026-02-23 11:10', language: 'JavaScript', status: 'Accepted',     runtime: '72 ms' },
    { id: 's-002-2', date: '2026-02-23 10:55', language: 'JavaScript', status: 'Wrong Answer', runtime: '—'     },
  ],
  'c-003': [],
};

// ── mockCourses ────────────────────────────────────────────────────────────────
// Used by: ManageCourses.tsx, TeacherCourses.tsx

export const mockCourses: Array<{
  id:           string;
  title:        string;
  description:  string;
  thumbnail:    string;
  challengeIds: string[];
  groupIds:     string[];
}> = [];

// ── mockLessons ────────────────────────────────────────────────────────────────
// Used by: LessonPage.tsx (future)

export const mockLessons: Array<{
  id:      string;
  courseId: string;
  title:   string;
  content: string;
  order:   number;
}> = [];

// ── mockExams ─────────────────────────────────────────────────────────────────
// Used by: ManageExams.tsx, TeacherExams.tsx

export const mockExams: Array<{
  id:              string;
  title:           string;
  durationMinutes: number;
  startDatetime:   string;
  endDatetime:     string;
  studentCount:    number;
  questions:       unknown[];
  violations:      unknown[];
}> = [];

// ── mockGroups ────────────────────────────────────────────────────────────────
// Used by: ManageGroups.tsx, ManageCourses.tsx, TeacherGroups.tsx, TeacherCourses.tsx

export const mockGroups: Array<{
  id:            string;
  name:          string;
  studentEmails: string[];
  courseIds:     string[];
}> = [];

// ── mockUser ──────────────────────────────────────────────────────────────────
// Mock login accounts — credentials, tokens, and user profiles.
// Used by: Login.tsx

export const mockUser = {
  admin: {
    email:    'admin@p2ip.dev',
    password: 'p2ip-admin-2024',
    token:    'mock-admin-jwt-token',
    profile:  { name: 'Admin', role: 'admin' as const },
  },
  teacher: {
    email:    'teacher@p2ip.dev',
    password: 'p2ip-teacher-2024',
    token:    'mock-teacher-jwt-token',
    profile:  { name: 'Teacher Demo', role: 'teacher' as const, teacherId: 't-001' },
  },
} as const;
