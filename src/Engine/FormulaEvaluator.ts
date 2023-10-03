import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";

// Enums
enum Operator {
  Add = '+',
  Subtract = '-',
  Multiply = '*',
  Divide = '/'
}

export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;


  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }


  /**
    * Evaluates a formula and returns the result.
   */
  evaluate(formula: FormulaType) {

    this._errorMessage = ErrorMessages.emptyFormula;
    this._result = 0;
    
    // If formula is empty, return nothing.
    if (formula.length === 0) {
      return;
    }

    const values: number[] = [];
    const operators: string[] = [];
    const calculate = this.calculate.bind(this, values);

    // If not empty, iterate through each token.
    for (const token of formula) {
      // If token is a number, push it to the values array.
      if (this.isNumber(token)) {
        values.push(Number(token));
      } 
      // If token is a cell reference, push its value to the values array.
      else if (this.isCellReference(token)) {
        const [value, cellError] = this.getCellValue(token);
        if (cellError) {
          this._result = value;
          this._errorMessage = cellError;
        } else {
          values.push(value);
        }
      } 
      else {
        this.handleToken(token, operators, calculate);
      }
    }

    // Calculate remaining operators.
    while (operators.length) {
      calculate(operators.pop()!);
    }

    // If there is only one value left, it is the result.
    if (values.length === 1 && this._errorMessage !== ErrorMessages.invalidFormula) {
      this._result = values[0];
      this._errorMessage = "";
    } else if (values.length === 0 && this._errorMessage === ErrorMessages.emptyFormula) {
      this._result = 0;
      this._errorMessage = ErrorMessages.missingParentheses;
    } 
  }

  /**
  * Handles a token in the formula.
  * @param token - the token to handle
  * @param operators - the array storing operators
  * @param calculate - the function to calculate the result
  */
  handleToken(token: TokenType, operators: string[], calculate: (operator: string) => void) {
    switch (token) {
      case Operator.Add:
      case Operator.Subtract:
      case Operator.Multiply:
      case Operator.Divide:
        while (operators.length && this.getPrecedence(operators[operators.length - 1]) >= this.getPrecedence(token as string)) {
          calculate(operators.pop()!);
        }
        operators.push(token as string);
        break;
      case '(':
        operators.push(token as string);
        break;
      case ')':
        while (operators.length && operators[operators.length - 1] !== '(') {
          calculate(operators.pop()!);
        }
        operators.pop();
        break;
      default:
        throw new Error(ErrorMessages.invalidFormula);
    }
  }

  /**
   * Calculates the result of an operation.
   * @param values - the array storing values
   * @param operator - the operator to use
   */
  calculate(values: number[], operator: string) {
    if (values.length === 0) {
      return;
    }
    if (values.length < 2) {
      this._errorMessage = ErrorMessages.invalidFormula;
      this._result = values.pop()!;
      return;

    }
    const right = values.pop()!;
    const left = values.pop()!;

    switch (operator) {
      case Operator.Add:
        values.push(left + right);
        break;
      case Operator.Subtract:
        values.push(left - right);
        break;
      case Operator.Multiply:
        values.push(left * right);
        break;
      case Operator.Divide:
        if (right === 0) {
          this._errorMessage = ErrorMessages.divideByZero;
          this._result = Infinity;
        } else {
          values.push(left / right);
        }
        break;
      default:
        throw new Error(ErrorMessages.invalidFormula);
      }
    }
  
  /**
   * Returns the precedence level of an operator.
   * @param operator - the operator to check
   * @returns the precedence level of the operator
   */
  getPrecedence(operator: string): number {
    switch (operator) {
      case Operator.Add:
      case Operator.Subtract:
        return 1;
      case Operator.Multiply:
      case Operator.Divide:
        return 2;
      default:
        return 0;
    }
  }

  public get errorOccured(): boolean {
    return this._errorOccured;
  }

  public get error(): string {
    return this._errorMessage
  }

  public get result(): number {
    return this._result;
  }

  public get lastResult(): number {
    return this._lastResult;
  }

  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }
}

export default FormulaEvaluator;