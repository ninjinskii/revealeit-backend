import {
  assertEquals,
  assertSpyCall,
  assertSpyCalls,
  describe,
  it,
  spy,
} from "../../../deps.ts";
import {
  FakeReceiveableMessage,
  FakeSendableMessage,
  simpleStub,
} from "../../util/test-utils.ts";
import { WebSocketMessenger } from "../Messenger.ts";
import { WebSocketClient } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { Constants } from "../../model/Constants.ts";
import { Board } from "../../domain/Board.ts";

describe("WebSocketMessenger", () => {
  const gameStartSpy = spy();
  const onSpy = spy();
  const sendSpy = spy();
  const closeSpy = spy();
  const fakeWebSocket = {
    on: onSpy,
    send: sendSpy,
    close: closeSpy,
  } as unknown as WebSocketClient;

  it("should listen for events", () => {
    new WebSocketMessenger(
      fakeWebSocket,
      new Board(),
      [],
      gameStartSpy,
    );

    // Need to find a way to spy on bounded methods
    // assertSpyCall(onSpy, 0, {
    //   args: ["message", messenger["boundOnMessage"]],
    // });
    // assertSpyCall(onSpy, 1, {
    //   args: ["error", messenger["boundOnError"]],
    // });
    // assertSpyCall(onSpy, 2, {
    //   args: ["close", messenger["boundOnClose"]],
    // });
    assertSpyCalls(gameStartSpy, 0);
  });

  describe("sendMessage", () => {
    it("can send a message", () => {
      const gameStartSpy = spy();
      const messenger = new WebSocketMessenger(
        fakeWebSocket,
        new Board(),
        [],
        gameStartSpy,
      );
      const fakeMessage = new FakeSendableMessage();
      const prepareSpy = simpleStub(fakeMessage, "prepare", fakeMessage);
      const buildSpy = simpleStub(fakeMessage, "build", "fakemessage");

      messenger.sendMessage(fakeMessage);

      assertSpyCalls(prepareSpy, 1);
      assertSpyCalls(buildSpy, 1);
      assertSpyCall(sendSpy, 0, { args: ["fakemessage"] });
      assertSpyCalls(gameStartSpy, 0);
    });
  });

  describe("endCommunication", () => {
    it("can stop communication", () => {
      const gameStartSpy = spy();
      const messenger = new WebSocketMessenger(
        fakeWebSocket,
        new Board(),
        [],
        gameStartSpy,
      );

      messenger.endCommunication();

      assertSpyCall(closeSpy, 0, {
        args: [Constants.WEB_SOCKET_CLOSE_END_GAME_CODE],
      });
    });
  });

  describe("setOnClosedListener", () => {
    it("should accept a close listener", () => {
      const closeListener = () => {};
      const messenger = new WebSocketMessenger(
        fakeWebSocket,
        new Board(),
        [],
        () => new Board(),
      );
      assertEquals(messenger["onCloseListener"], undefined);

      messenger.setOnClosedListener(closeListener);

      assertEquals(messenger["onCloseListener"], closeListener);
    });
  });

  describe("onMessage", () => {
    it("should handle message", () => {
      const gameStartSpy = spy();
      const messenger = new WebSocketMessenger(
        fakeWebSocket,
        new Board(),
        [],
        gameStartSpy,
      );
      const fakeMessage = new FakeReceiveableMessage("", "");
      const executeSpy = simpleStub(fakeMessage, "execute", undefined);
      const receiveSpy = simpleStub(messenger, "receiveMessage", fakeMessage);

      messenger["onMessage"]("message");

      assertSpyCall(receiveSpy, 0, { args: ["message"] });
      assertSpyCalls(executeSpy, 1);
    });

    it("should handle error when parsing message", () => {
      const gameStartSpy = spy();
      const messenger = new WebSocketMessenger(
        fakeWebSocket,
        new Board(),
        [],
        gameStartSpy,
      );
      const fakeMessage = new FakeReceiveableMessage("", "");
      const executeSpy = simpleStub(fakeMessage, "execute", undefined);
      const receiveSpy = simpleStub(messenger, "receiveMessage", () => {
        throw new Error();
      });
      const errorSpy = simpleStub(
        messenger["errorHandler"],
        "registerError",
        undefined,
      );

      messenger["onMessage"]("message");

      assertSpyCall(receiveSpy, 0, { args: ["message"] });
      assertSpyCalls(executeSpy, 0);
      assertSpyCalls(errorSpy, 1);
    });
  });

  describe("onClose", () => {
    it("should call close listener when socket is closed", () => {
      const gameStartSpy = spy();
      const onCloseListener = spy();
      const messenger = new WebSocketMessenger(
        fakeWebSocket,
        new Board(),
        [],
        gameStartSpy,
      );
      messenger.setOnClosedListener(onCloseListener);

      messenger["onClose"](666);

      assertSpyCall(onCloseListener, 0, { args: [666] });
    });
  });
});
