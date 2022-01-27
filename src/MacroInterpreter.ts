import { tokenMatcher } from "chevrotain";

import {
  NumericLiteralCstChildren,
  ProgramCstNode,
  ValueExpressionCstChildren,
  ValueLiteralCstChildren,
  VariableAssignmentCstChildren,
  VariableLiteralCstChildren
} from "../types/fanuc";
import { parser } from "./MacroParser";
import MacroVariables from "./MacroVariables";
import { Plus, Product } from "./tokens/tokens";
import { getImage } from "./utils";

interface VariableLookup {
  register: number;
  value?: number;
}

// ----------------- Interpreter -----------------
// Obtains the default CstVisitor constructor to extend.
// const BaseCstVisitor = parser.getBaseCstVisitorConstructor();
const BaseCstVisitorWithDefaults =
  parser.getBaseCstVisitorConstructorWithDefaults();

// All our semantics go into the visitor, completly separated from the grammar.
export default class MacroInterpreter extends BaseCstVisitorWithDefaults {
  vars: MacroVariables;
  varStack: MacroVariables[];

  constructor() {
    super();
    this.vars = new MacroVariables(1, 10);
    this.varStack = [];
    this.validateVisitor();
  }

  public getMacros(): Map<number, number> {
    return this.vars._vars;
  }

  // public getSetVars() {
  //   const entries = this.vars._vars.entries();
  // }

  program(ctx: ProgramCstNode) {
    return ctx;
  }

  expression(ctx) {
    // visiting an array is equivalent to visiting its first element.
    if (ctx.additionExpression) {
      return this.visit(ctx.additionExpression);
    }

    if (ctx.multiplicationExpression) {
      return this.visit(ctx.multiplicationExpression);
    }
  }

  NumericLiteral(ctx: NumericLiteralCstChildren) {
    const isNegative = ctx.Minus ? true : false;
    const image = getImage(ctx.NumericValue[0]);

    /**
     * @TODO parse int or float here?
     */
    return parseFloat(`${isNegative ? "-" : ""}${image}`);
  }

  VariableLiteral(ctx: VariableLiteralCstChildren): VariableLookup {
    const register = parseInt(getImage(ctx.Integer));

    return {
      register,
      value: this.vars.read(register)
    };
  }

  ValueLiteral(ctx: ValueLiteralCstChildren) {
    if (ctx.VariableLiteral) {
      const macro: VariableLookup = this.visit(ctx.VariableLiteral);

      return macro.value;
    }

    if (ctx.NumericLiteral) {
      const value = this.visit(ctx.NumericLiteral);

      return value;
    }
  }

  variableAssignment(ctx: VariableAssignmentCstChildren) {
    const macroVar: VariableLookup = this.visit(ctx.lhs);

    // "rhs" key may be undefined as the grammar defines it as optional (MANY === zero or more).
    if (ctx.rhs) {
      const value = this.visit(ctx.rhs);

      this.vars.write(macroVar.register, value);
    }
  }

  // Note the usage if the "rhs" and "lhs" labels to increase the readability.
  additionExpression(ctx) {
    let result = this.visit(ctx.lhs);

    // "rhs" key may be undefined as the grammar defines it as optional (MANY === zero or more).
    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand, idx) => {
        // there will be one operator for each rhs operand
        const rhsValue = this.visit(rhsOperand);
        const operator = ctx.AdditionOperator[idx];

        if (tokenMatcher(operator, Plus)) {
          result += rhsValue;
        } else {
          // Minus
          result -= rhsValue;
        }
      });
    }

    return result;
  }

  multiplicationExpression(ctx) {
    let result = this.visit(ctx.lhs);

    // "rhs" key may be undefined as the grammar defines it as optional (MANY === zero or more).
    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand, idx) => {
        // there will be one operator for each rhs operand
        const rhsValue = this.visit(rhsOperand);
        const operator = ctx.MultiplicationOperator[idx];

        if (tokenMatcher(operator, Product)) {
          result *= rhsValue;
        } else {
          // Division
          result /= rhsValue;
        }
      });
    }

    return result;
  }

  atomicExpression(ctx) {
    if (ctx.bracketExpression) {
      return this.visit(ctx.bracketExpression);
    } else if (ctx.NumberLiteral) {
      return parseInt(ctx.NumberLiteral[0].image, 10);
    } else if (ctx.powerFunction) {
      return this.visit(ctx.powerFunction);
    }
  }

  bracketExpression(ctx) {
    // The ctx will also contain the bracket tokens, but we don't care about those
    // in the context of calculating the result.
    return this.visit(ctx.expression);
  }

  powerFunction(ctx) {
    const base = this.visit(ctx.base);
    const exponent = this.visit(ctx.exponent);
    return Math.pow(base, exponent);
  }
}

export const interpreter = new MacroInterpreter();
