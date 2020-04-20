import test, { CbExecutionContext, ExecutionContext } from 'ava';
const Emulator = require('google-pubsub-emulator');

import { EmittedMessage, GCPubSub, PubSubFactory, Transport } from '../src';

const projectId: string = 'algoan-test';

let emulator: any;

interface OnMessage {
  hello: string;
}

test.before(async () => {
  emulator = new Emulator({
    project: projectId,
  });

  return emulator.start();
});

test.after.always(async () => {
  return emulator.stop();
});

test.cb('GPS001 - should properly emit and listen', (t: CbExecutionContext): void => {
  const topicName: string = 'test_a_created';
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      debug: true,
    },
  });

  void pubSub.listen(topicName, {
    options: {
      autoAck: true,
    },
    onMessage(message: EmittedMessage<OnMessage>): void {
      t.deepEqual(message.payload, {
        hello: 'world',
      });
      t.truthy(message.id);
      t.truthy(message.ackId);
      t.truthy(message.emittedAt);
      t.truthy(message.receivedAt);
      t.is(message.count, 0);
      t.truthy(message.duration);
      t.pass(`Listen successfully to the topic ${topicName}`);
      t.end();
    },
  });

  /**
   * The first client emit on a topic
   */
  setTimeout((): void => {
    void pubSub.emit(topicName, { hello: 'world' });
  }, 500);
});

test.cb(
  'GPS002 - should properly emit and but the ack method is never called - no ack',
  (t: CbExecutionContext): void => {
    const topicName: string = 'test_b_created';
    const pubSub: GCPubSub = PubSubFactory.create({
      transport: Transport.GOOGLE_PUBSUB,
      options: {
        projectId,
        namespace: 'test-app',
        environment: 'test',
      },
    });

    void pubSub.listen(topicName, {
      onMessage(message: EmittedMessage<OnMessage>): void {
        t.deepEqual(message.payload, {
          hello: 'world',
        });
        t.deepEqual(message.metadata, {
          namespace: 'test-app',
          environment: 'test',
        });
        t.truthy(message.id);
        t.truthy(message.ackId);
        t.truthy(message.emittedAt);
        t.truthy(message.receivedAt);
        t.is(message.count, 0);
        t.truthy(message.duration);
        t.pass(`Listen successfully to the topic ${topicName}`);
        t.end();
      },
      options: {
        autoAck: false,
      },
    });

    /**
     * The first client emit on a topic
     */
    setTimeout((): void => {
      void pubSub.emit(topicName, { hello: 'world' });
    }, 500);
  },
);

test('GPS003 - should add prefix to subscription and topic', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = 'topic_1';
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      topicsPrefix: 'algoan',
      subscriptionsPrefix: 'test-app',
    },
  });

  await pubsub.listen(topicName);

  const [isTopicExisting] = await pubsub.client.topic(`algoan+${topicName}`).exists();
  const [isSubcriptionExisting] = await pubsub.client.subscription(`test-app%${topicName}`).exists();

  t.true(isTopicExisting);
  t.true(isSubcriptionExisting);
});

test('GPS004 - should not add prefix to subscription and topic', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = 'topic_2';
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
    },
  });

  await pubsub.listen(topicName);

  const [isTopicExisting] = await pubsub.client.topic(`algoan+${topicName}`).exists();
  const [isSubcriptionExisting] = await pubsub.client.subscription(`test-app%${topicName}`).exists();
  const [isTopicExistingWithoutPrefix] = await pubsub.client.topic(topicName).exists();
  const [isSubcriptionExistingWithoutPrefix] = await pubsub.client.subscription(topicName).exists();

  t.false(isTopicExisting);
  t.false(isSubcriptionExisting);
  t.true(isTopicExistingWithoutPrefix);
  t.true(isSubcriptionExistingWithoutPrefix);
});
