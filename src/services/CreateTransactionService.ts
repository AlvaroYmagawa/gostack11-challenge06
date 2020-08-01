import { getRepository, getCustomRepository } from 'typeorm';

// CUSTOM IMPORTS
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: string;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);

    if (type !== 'income' && type !== 'outcome')
      throw new AppError('Field type is not valid.', 401);

    const { total } = await transactionRepository.getBalance();

    if (type === 'outcome' && total < value)
      throw new AppError(
        'You do not have enough balance to complete the transaction. ',
        400,
      );

    const existingCategory = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    let newCategory;

    if (!existingCategory) {
      newCategory = categoryRepository.create({
        title: category,
      });

      await categoryRepository.save(newCategory);
    }
    const transaction = transactionRepository.create({
      title,
      value,
      type,
      category: existingCategory || newCategory,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
