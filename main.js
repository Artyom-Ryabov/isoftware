// @ts-check

const { dispatch, stop, Ref } = require('nact');
const system = require('./src/system');
const { CompanyMsg } = require('./src/actors/msg');
const spawn_company = require('./src/actors/company');
const inquirer = require('@inquirer/prompts');
const { wait } = require('./src/lib/utlis');

/** @enum {string} */
const Actions = {
    LOG: 'Отобразить статус',
    ADD: 'Добавить',
    REMOVE: 'Убрать',
    ACTIVATE: 'Восстановить',
    DELETE: 'Удалить',
    EXIT: 'Выйти'
};

main();

/**
 * @param {Ref} actor
 * @param {string[]} ids
 */
async function add_courier(actor, ids) {
    const id = `Courier-${ids.length}`;
    const name = await inquirer.input({ message: 'Введите имя:' });
    const location = await inquirer.input({ message: 'Введите стартовую точку (x и y):' });
    const [x, y] = location.split(' ').map(p => parseInt(p));
    if (typeof x !== 'number' || typeof y !== 'number') {
        console.error('Неверно введены координаты');
        await add_courier(actor, ids);
        return;
    }
    const lift = parseInt(
        await inquirer.input({ message: 'Введите максимальный переносимый вес:' })
    );
    if (typeof lift !== 'number') {
        console.error('Неверно введен максимальный переносимый вес');
        await add_courier(actor, ids);
        return;
    }
    const workload = parseInt(
        await inquirer.input({
            message: 'Введите максимальное число заказов за смену:'
        })
    );
    if (typeof workload !== 'number') {
        console.error('Неверно введено максимальное число заказов за смену');
        await add_courier(actor, ids);
        return;
    }
    const cost = parseInt(
        await inquirer.input({ message: 'Введите стоимость услуги курьера (за 1 км):' })
    );
    if (typeof cost !== 'number') {
        console.error('Неверно введена стоимость услуги курьера');
        await add_courier(actor, ids);
        return;
    }
    ids.push(id);
    dispatch(actor, {
        name: CompanyMsg.CREATE_COURIER,
        value: {
            id,
            init_state: {
                name,
                location: { x, y },
                lift,
                workload,
                cost,
                total: 0,
                schedule: [],
                discard_ref: null
            }
        },
        sender: actor
    });
}

/**
 * @param {Ref} actor
 * @param {string[]} ids
 */
async function add_order(actor, ids) {
    const id = `Order-${ids.length}`;
    const from = await inquirer.input({ message: 'Введите стартовую точку (x и y):' });
    const [from_x, from_y] = from.split(' ').map(p => parseInt(p));
    if (typeof from_x !== 'number' || typeof from_y !== 'number') {
        console.error('Неверно введены начальные координаты');
        await add_order(actor, ids);
        return;
    }
    const to = await inquirer.input({ message: 'Введите конечную точку (x и y):' });
    const [to_x, to_y] = to.split(' ').map(p => parseInt(p));
    if (typeof to_x !== 'number' || typeof to_y !== 'number') {
        console.error('Неверно введены конечные координаты');
        await add_order(actor, ids);
        return;
    }
    const weight = parseInt(await inquirer.input({ message: 'Введите вес:' }));
    if (typeof weight !== 'number') {
        console.error('Неверно введен вес');
        await add_order(actor, ids);
        return;
    }
    const price = parseInt(
        await inquirer.input({
            message: 'Введите цену:'
        })
    );
    if (typeof price !== 'number') {
        console.error('Неверно введена цена за заказ');
        await add_order(actor, ids);
        return;
    }
    ids.push(id);
    dispatch(actor, {
        name: CompanyMsg.CREATE_ORDER,
        value: {
            id,
            init_state: {
                from: {
                    x: from_x,
                    y: from_y
                },
                to: {
                    x: to_x,
                    y: to_y
                },
                weight,
                price,
                order_plan: null,
                num_couriers: 0,
                courier_schedules: [],
                in_process: false
            }
        },
        sender: actor
    });
}

/**
 * @param {Ref} actor
 * @param {Actions} action
 * @param {boolean} is_first
 * @param {string[]} ids
 */
async function handle_action(actor, action, is_first, ids) {
    const id = await inquirer.select({
        message: 'Выберете:',
        choices: ids.map(i => ({
            value: i
        }))
    });
    switch (action) {
        case Actions.REMOVE:
            dispatch(actor, {
                name: is_first ? CompanyMsg.REMOVE_COURIER : CompanyMsg.REMOVE_ORDER,
                value: id,
                sender: actor
            });
            break;
        case Actions.ACTIVATE:
            dispatch(actor, {
                name: is_first ? CompanyMsg.ACTIVATE_COURIER : CompanyMsg.ACTIVATE_ORDER,
                value: id,
                sender: actor
            });
            break;
        case Actions.DELETE:
            dispatch(actor, {
                name: is_first ? CompanyMsg.DELETE_COURIER : CompanyMsg.DELETE_ORDER,
                value: id,
                sender: actor
            });
            ids.splice(
                ids.findIndex(i => i === id),
                1
            );
            break;
    }
}

async function main() {
    const company = spawn_company(system, 'Delivery-company');
    const couriers_id = [];
    const orders_id = [];
    while (true) {
        await wait(1000);
        const action = await inquirer.select({
            message: 'Выберете действие:',
            choices: [
                {
                    name: Actions.LOG,
                    value: Actions.LOG
                },
                {
                    name: Actions.ADD,
                    value: Actions.ADD
                },
                {
                    name: Actions.REMOVE,
                    value: Actions.REMOVE
                },
                {
                    name: Actions.ACTIVATE,
                    value: Actions.ACTIVATE
                },
                {
                    name: Actions.DELETE,
                    value: Actions.DELETE
                },
                {
                    name: Actions.EXIT,
                    value: Actions.EXIT
                }
            ]
        });
        if (action === Actions.EXIT) {
            stop(system);
            break;
        }
        if (action === Actions.LOG) {
            dispatch(company, { name: CompanyMsg.LOG, value: null, sender: company });
            continue;
        }
        const is_first = await inquirer.select({
            message: 'Что именно?',
            choices: [
                {
                    name: 'Курьера',
                    value: true
                },
                {
                    name: 'Заказ',
                    value: false
                }
            ]
        });
        if (action !== Actions.ADD) {
            await handle_action(company, action, is_first, is_first ? couriers_id : orders_id);
            continue;
        }
        if (is_first) {
            await add_courier(company, couriers_id);
        } else {
            await add_order(company, orders_id);
        }
    }
}
