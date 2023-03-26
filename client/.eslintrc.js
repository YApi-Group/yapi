const jsRules = {
  ...{
    // 禁止在正则表达式中出现 Ctrl 键的 ASCII 表示，即禁止使用 /\x1f/
    'no-control-regex': 'off',

    // 客户端没必要开这个
    'no-prototype-builtins': 'off',
  },

  // Best Practices: 这些规则是关于最佳实践的，帮助你避免一些问题
  ...{
    // setter必须有getter
    'accessor-pairs': 'error',

    // 控制语句单行没有大括号或者多行有大括号
    'curly': ['warn', 'all'],

    // 要求 switch 语句中有 default 分支
    'default-case': 'warn',

    // 只能在点号之前换行
    'dot-location': ['warn', 'property'],

    // 尽可能使用点号而不使用中括号
    'dot-notation': 'warn',

    /**
     * 除了以下这些情况外，强制使用 === 和 !==：
     * 比较两个字面量的值
     * 比较 typeof 的值
     * 与 null 进行比较
     */
    'eqeqeq': ['error', 'smart'],

    // for in 内部必须有 if hasOwnProperty
    'guard-for-in': 'warn',

    // 禁止 if 语句中 return 语句之后有 else 块
    'no-else-return': 'warn',

    // 禁止空函数
    'no-empty-function': 'warn',

    // 禁用eval
    'no-eval': 'warn',

    // 禁止扩展原生类
    'no-extend-native': 'warn',

    // 禁止使用短符号进行类型转换
    'no-implicit-coercion': [
      'warn',
      {
        boolean: false,
      },
    ],

    // 禁止 this 关键字出现在类和类对象之外
    'no-invalid-this': 'warn',

    // 禁用 __iterator__ 属性
    'no-iterator': 'warn',

    // 禁止使用多个空格
    'no-multi-spaces': 'warn',

    // 禁止使用斜线创建多行字符串
    'no-multi-str': 'error',

    // 禁止对 Function 对象使用 new 操作符
    'no-new-func': 'warn',

    // 禁止对 String，Number 和 Boolean 使用 new 操作符
    'no-new-wrappers': 'warn',

    // 禁止使用__proto__，已被弃用
    'no-proto': 'error',

    // 禁止在 return 语句中使用赋值语句
    'no-return-assign': 'warn',

    // 禁用不必要的 return await
    'no-return-await': 'warn',

    // 禁止自身比较
    'no-self-compare': 'warn',

    // 禁用不必要的逗号操作符
    'no-sequences': 'warn',

    // 禁止抛出异常字面量
    'no-throw-literal': 'warn',

    // 禁用一成不变的循环条件
    'no-unmodified-loop-condition': 'error',

    // 禁止出现未使用过的表达式
    'no-unused-expressions': [
      'warn',
      {
        allowShortCircuit: true,
      },
    ],

    // 禁止不必要的 .call() 和 .apply()，效率低，尽量用解构代替，
    'no-useless-call': 'warn',

    // 禁止不必要的字符串字面量或模板字面量的连接
    'no-useless-concat': 'warn',

    // 禁止多余的return
    'no-useless-return': 'warn',

    // 禁止使用不带 await 表达式的 async 函数
    'require-await': 'warn',

    // 需要把立即执行的函数包裹起来
    'wrap-iife': 'warn',
  },

  // Variables: 这些规则与变量声明有关
  ...{
    // 禁止在变量定义之前使用它们
    'no-use-before-define': [
      'error',
      {
        functions: false,
      },
    ],
  },

  // ECMAScript 6: 这些规则只与 ES6 有关, 即通常所说的 ES2015
  ...{
    // 禁用不必要的构造函数
    'no-useless-constructor': 'warn',

    // 禁止在 import 和 export 和解构赋值时将引用重命名为相同的名字
    'no-useless-rename': 'warn',

    // 要求使用 let 或 const 而不是 var
    'no-var': 'warn',

    // 要求使用 const 声明那些声明后不再被修改的变量
    'prefer-const': 'warn',

    // 要求使用剩余参数而不是 arguments
    'prefer-rest-params': 'warn',

    // 要求使用扩展运算符而非 .apply()
    'prefer-spread': 'warn',

    // 剩余和扩展运算符及其表达式之间不得有空格
    'rest-spread-spacing': 'warn',

    // 禁止模板字符串中的嵌入表达式周围空格的使用
    'template-curly-spacing': 'warn',

    // 对 import 排序
    'import/order': [
      'warn',
      {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object'],
        'pathGroups': [
          {
            pattern: '@?(common)/**',
            group: 'internal',
          },
        ],
        'pathGroupsExcludedImportTypes': ['builtin'],
        'newlines-between': 'always',
        'alphabetize': { order: 'asc' },
      },
    ],
    'import/no-dynamic-require': 'warn',
  },
}

const tsRules = {
  'no-invalid-this': 'off',

  // 这两个强制写返回类型的关掉
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/explicit-module-boundary-types': 'off',

  '@typescript-eslint/member-delimiter-style': [
    'error',
    {
      multiline: {
        delimiter: 'none',
        requireLast: true,
      },
      singleline: {
        delimiter: 'comma',
        requireLast: false,
      },
    },
  ],

  '@typescript-eslint/no-explicit-any': 'off',

  // 下方 no-use-before-define 要先关掉，这是官方建议的，否则会出问题
  'no-use-before-define': 'off',
  '@typescript-eslint/no-use-before-define': [
    'error',
    {
      functions: false,
    },
  ],
}

const babelRules = {
  'no-invalid-this': 'off',
  '@babel/no-invalid-this': 'warn',

  'no-unused-expressions': 'off',
  '@babel/no-unused-expressions': [
    'warn',
    {
      allowShortCircuit: true,
    },
  ],

  'new-cap': 'off',
  '@babel/new-cap': 'warn',

  'object-curly-spacing': 'off',
  '@babel/object-curly-spacing': ['warn', 'always'],

  'semi': 'off',
  '@babel/semi': ['warn', 'never'],
}

module.exports = {
  root: true, // 表示不再继续向父节点查找了

  env: {
    browser: true, // 浏览器环境中的全局变量
    node: true, // Node.js 全局变量和 Node.js 作用域。
    es2020: true, // 启用除了 modules 以外的所有 ECMAScript 6 特性（该选项会自动设置 ecmaVersion 解析器选项为 6）
    commonjs: true, // CommonJS 全局变量和 CommonJS 作用域
    jest: true, // Jest 全局变量
  },

  globals: {
    VERSION_INFO: 'readonly',
  },

  settings: {
    react: {
      version: 'detect',
    },
  },

  overrides: [
    {
      files: ['*.js', '*.jsx'],
      plugins: ['react', 'import', '@babel', 'prettier'],
      extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:prettier/recommended'],

      parser: '@babel/eslint-parser',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        sourceType: 'module',
      },

      rules: {
        ...jsRules,
        ...babelRules,
        'prettier/prettier': 'warn',
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      plugins: ['react', 'import', '@typescript-eslint', 'prettier'],
      extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/typescript', // this line does the trick
        'plugin:prettier/recommended',
      ],

      parser: '@typescript-eslint/parser',
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
      },

      rules: {
        ...jsRules,
        ...tsRules,
        'prettier/prettier': 'warn',
      },
    },
  ],
}
