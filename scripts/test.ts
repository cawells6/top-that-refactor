// scripts/test.ts
function greet(message: string): void {
    console.log(message);
}

greet("Hello from test.ts!");

const main = async () => {
    await Promise.resolve();
    console.log("Async operation completed in test.ts");
};

main().catch(err => {
    console.error("Error in test.ts main async function:", err);
});

console.log("Test.ts finished synchronous execution.");
