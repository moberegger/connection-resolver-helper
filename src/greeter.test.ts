import greeter from ".";

test("My Greeter", () => {
  expect(greeter("Carl")).toBe("Hello, Carl");
});
