const jsRules = {
  // Possible Errors： 这些规则与 JavaScript 代码中可能的错误或逻辑错误有关
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

    // 在类的非静态方法中，必须存在对 this 的引用
    'class-methods-use-this': 'warn',

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

    /*                // 禁用魔术数字
         'no-magic-numbers': [
         'warn',
         {
         'ignore': [-1, 0, 1],
         'ignoreArrayIndexes': true,
         'enforceConst': true,
         },
         ],*/

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

  // Stylistic Issues: 这些规则是关于风格指南的
  ...{
    // 每一行中最多只能有2条语句
    'max-statements-per-line': [
      'error',
      {
        max: 2,
      },
    ],

    // new 后面的类名必须首字母大写
    'new-cap': 'warn',

    // 禁止 if 作为唯一的语句出现在 else 语句中
    'no-lonely-if': 'warn',

    // 禁止连续赋值，对变量连续赋值可能会导致意想不到的结果，而且难以阅读
    'no-multi-assign': 'warn',

    // 禁用 Object 的构造函数
    'no-new-object': 'warn',

    // ++ 和 -- 只允许出现在 for 循环的最后一个表达式中
    'no-plusplus': [
      'warn',
      {
        allowForLoopAfterthoughts: true,
      },
    ],

    // 禁止使用with
    'no-restricted-syntax': ['warn', 'WithStatement'],

    // 禁止可以表达为更简单结构的三元操作符
    'no-unneeded-ternary': 'warn',

    // 禁止使用以对象字面量作为第一个参数的 Object.assign，优先使用对象扩展。
    'prefer-object-spread': 'warn',

    // 注释的斜线或 * 后必须有空格
    'spaced-comment': 'warn',
  },

  // ECMAScript 6: 这些规则只与 ES6 有关, 即通常所说的 ES2015
  ...{
    // 当箭头函数大括号是可以省略的，强制不使用它们
    'arrow-body-style': 'warn',

    // 箭头函数的参数的圆括号在可以的地方强制不使用
    'arrow-parens': ['warn', 'as-needed'],

    // 箭头函数的箭头之前或之后有一个或多个空格
    'arrow-spacing': 'warn',

    // 禁止重复导入
    'no-duplicate-imports': 'warn',

    // 禁止在对象中使用不必要的计算属性
    'no-useless-computed-key': 'warn',

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
        'newlines-between': 'always',
        'alphabetize': { order: 'asc' },
      },
    ],
    'import/no-dynamic-require': 'warn',
  },
}

const tsRules = {
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

  '@typescript-eslint/ban-ts-comment': 'warn',
}

module.exports = {
  /* 当多个项目共存时，设置 root 防止 eslint 配置文件重复加载 */
  root: true,

  // 环境，定义了一组预定义的全局变量
  env: {
    // 'browser': true, // 浏览器环境中的全局变量
    node: true, // Node.js 全局变量和 Node.js 作用域。
    es2021: true, // 启用除了 modules 以外的所有 ECMAScript 6 特性（该选项会自动设置 ecmaVersion 解析器选项为 6）
    commonjs: true, // CommonJS 全局变量和 CommonJS 作用域
    jest: true, // Jest 全局变量
  },

  // 脚本在执行期间访问的额外的全局变量
  globals: {
    // PRODUCTION: 'readonly',
  },

  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      globalReturn: false, // 不允许在全局作用域下使用 return 语句
      impliedStrict: true, // 启用全局 strict mode
      // jsx: true, // 启用 JSX
    },
  },

  overrides: [
    {
      files: ['*.js', '*.jsx'],
      plugins: ['import', 'prettier'],
      extends: ['eslint:recommended', 'plugin:prettier/recommended'],

      parser: '@babel/eslint-parser',

      rules: {
        ...jsRules,
        'prettier/prettier': 'warn',
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      plugins: ['@typescript-eslint', 'import', 'prettier'],
      extends: [
        'eslint:recommended',
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
