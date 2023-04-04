import { assertEquals, assertSpyCall, assertSpyCalls, assertThrows, beforeEach, describe, it, spy } from "../../../deps.ts";
import { FakeSendableMessage, FakeReceiveableMessage, simpleStub } from "../../util/test-utils.ts";
import { WebSocketMessenger } from "../Messenger.ts";
import { WebSocketClient } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { Constants } from "../../model/Constants.ts";

describe("WebSocketMessenger", () => {
  const gameStartSpy = spy()
  const onSpy = spy()
  const sendSpy = spy()
  const closeSpy = spy()
  const fakeWebSocket = {
    on: onSpy,
    send: sendSpy,
    close: closeSpy,
  } as unknown as WebSocketClient

  it("should listen for events", () => {
    const messenger = new WebSocketMessenger(fakeWebSocket, undefined, [], gameStartSpy)

    assertSpyCall(onSpy, 0, { args: ["message", messenger["onMessage"]] })
    assertSpyCall(onSpy, 1, { args: ["error", messenger["onError"]] })
    assertSpyCall(onSpy, 2, { args: ["close", messenger["onClose"]] })
    assertSpyCalls(gameStartSpy, 0)
  })

  it("can send a message", () => {
    const gameStartSpy = spy()
    const messenger = new WebSocketMessenger(fakeWebSocket, undefined, [], gameStartSpy)
    const fakeMessage = new FakeSendableMessage()
    const prepareSpy = simpleStub(fakeMessage, "prepare", fakeMessage)
    const buildSpy = simpleStub(fakeMessage, "build", "fakemessage")

    messenger.sendMessage(fakeMessage)

    assertSpyCalls(prepareSpy, 1)
    assertSpyCalls(buildSpy, 1)
    assertSpyCall(sendSpy, 0, { args: ["fakemessage"] })
    assertSpyCalls(gameStartSpy, 0)
  })

  it("can stop communication", () => {
    const gameStartSpy = spy()
    const messenger = new WebSocketMessenger(fakeWebSocket, undefined, [], gameStartSpy)

    messenger.endCommunication()

    assertSpyCall(closeSpy, 0, { args: [Constants.WEB_SOCKET_CLOSE_END_GAME_CODE] })
  })

  it("should accept a close listener", () => {
    const closeListener = () => {}
    const messenger = new WebSocketMessenger(fakeWebSocket, undefined, [], closeListener)
    assertEquals(messenger["onCloseListener"], undefined)

    messenger.setOnClosedListener(closeListener)

    assertEquals(messenger["onCloseListener"], closeListener)
  })

  it("should handle message", () => {
    const gameStartSpy = spy()
    const messenger = new WebSocketMessenger(fakeWebSocket, undefined, [], gameStartSpy)
    const fakeMessage = new FakeReceiveableMessage("", "")
    const executeSpy = simpleStub(fakeMessage, "execute", undefined)
    const receiveSpy = simpleStub(messenger, "receiveMessage", fakeMessage)

    messenger["onMessage"]("message")

    assertSpyCall(receiveSpy, 0, { args: ["message"] })
    assertSpyCalls(executeSpy, 1)
  })

  it("should handle error when parsing message", () => {
    const gameStartSpy = spy()
    const messenger = new WebSocketMessenger(fakeWebSocket, undefined, [], gameStartSpy)
    const fakeMessage = new FakeReceiveableMessage("", "")
    const executeSpy = simpleStub(fakeMessage, "execute", undefined)
    const receiveSpy = simpleStub(messenger, "receiveMessage", () => { throw new Error() })
    const errorSpy = simpleStub(messenger["errorHandler"], "registerError", undefined)

    messenger["onMessage"]("message")

    assertSpyCall(receiveSpy, 0, { args: ["message"] })
    assertSpyCalls(executeSpy, 0)
    assertSpyCalls(errorSpy, 1)
  })

  it("should call close listener when socket is closed", () => {
    const gameStartSpy = spy()
    const onCloseListener = spy()
    const messenger = new WebSocketMessenger(fakeWebSocket, undefined, [], gameStartSpy)
    messenger.setOnClosedListener(onCloseListener)

    messenger["onClose"](666)

    assertSpyCall(onCloseListener, 0, { args: [666] })
  })
})