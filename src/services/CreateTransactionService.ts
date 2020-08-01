import { getRepository } from 'typeorm';

// CUSTOM IMPORTS
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
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
    const transactionRepository = getRepository(Transaction);
    const categoryRepository = getRepository(Category);

    if (type !== 'income' && type !== 'outcome')
      throw new AppError('Field type is not valid.', 401);

    const existingCategory = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    let newCategory;

    if (!existingCategory) {
      newCategory = await categoryRepository.create({
        title: category,
      });

      await categoryRepository.save(newCategory);
    }
    const transaction = await transactionRepository.create({
      title,
      value,
      type,
      category_id: existingCategory ? existingCategory.id : newCategory?.id,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
